import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { 
  dataExchangeService, 
  dataExchanges, 
  exchangeAuditLogs, 
  EXCHANGE_POLICIES, 
  EXCHANGE_STATUS 
} from '../server/exchange/index.js';
import { minimizeData } from '../server/exchange/data-minimizer.js';

describe('Phase 10 — Secure Inter-Department Data Exchange Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  const request = (method, pathUrl, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const reqHeaders = { ...headers };
      let payload = null;
      if (body) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        if (!reqHeaders['Content-Length']) {
          reqHeaders['Content-Length'] = Buffer.byteLength(payload);
        }
      }

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: pathUrl,
        method,
        headers: reqHeaders
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
          }
        });
      });

      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  };

  it('Start dev server with Secure Data Exchange Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, Officers, and Admin', async () => {
    // 1. Citizen 1
    const reg1 = await request('POST', '/api/v1/auth/register', {
      name: 'Exchange Citizen 1',
      email: `exch_cit1_${Date.now()}@example.com`,
      password: 'Password@123',
      phone: '+91 98765 11111',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(reg1.statusCode, 201);
    citizen1Token = reg1.data.token;

    // 2. Citizen 2
    const reg2 = await request('POST', '/api/v1/auth/register', {
      name: 'Exchange Citizen 2',
      email: `exch_cit2_${Date.now()}@example.com`,
      password: 'Password@123',
      phone: '+91 98765 22222',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(reg2.statusCode, 201);
    citizen2Token = reg2.data.token;

    // 3. Education Officer
    const eduLogin = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(eduLogin.statusCode, 200);
    eduOfficerToken = eduLogin.data.token;

    // 4. Revenue Officer
    const revLogin = await request('POST', '/api/v1/auth/login', {
      email: 'officer.rev@gov.in',
      password: 'Officer@123'
    });
    assert.equal(revLogin.statusCode, 200);
    revOfficerToken = revLogin.data.token;

    // 5. Admin
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adminLogin.statusCode, 200);
    adminToken = adminLogin.data.token;
  });

  // 1. Security Policies & Authorization Enforcement
  describe('Exchange Authorization & Policy Enforcement', () => {
    it('authorizes a valid department exchange request under approved policy', async () => {
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'DIGILOCKER',
        targetDepartment: 'EDUCATION',
        applicationId: 'APP-2026-TEST-001',
        purpose: 'ACADEMIC_ENROLLMENT_VERIFICATION',
        requestedFields: ['citizenId', 'name', 'dateOfBirth', 'mobile']
      }, {
        'Authorization': `Bearer ${citizen1Token}`,
        'X-Request-Id': 'req-policy-pass'
      });

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.exchange.status, EXCHANGE_STATUS.AUTHORIZED);
      assert.ok(res.data.exchange.exchangeId.startsWith('EXC-2026-'));
      assert.deepEqual(res.data.exchange.permittedFields, ['citizenId', 'name', 'dateOfBirth', 'mobile']);
    });

    it('rejects an unauthorized department pair (e.g. EDUCATION -> HEALTH) with HTTP 403', async () => {
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'EDUCATION',
        targetDepartment: 'HEALTH',
        applicationId: 'APP-2026-TEST-002',
        purpose: 'AYUSHMAN_BENEFICIARY_VERIFICATION',
        requestedFields: ['name']
      }, {
        'Authorization': `Bearer ${citizen1Token}`
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.equal(res.data.exchange.status, EXCHANGE_STATUS.REJECTED);
      assert.equal(res.data.exchange.rejectionCode, 'UNAUTHORIZED_DEPARTMENT_PAIR');
      assert.ok(res.data.exchange.rejectionReason.includes('not permitted'));
    });

    it('rejects an invalid purpose for a permitted department pair with HTTP 403', async () => {
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'DIGILOCKER',
        targetDepartment: 'EDUCATION',
        applicationId: 'APP-2026-TEST-003',
        purpose: 'INVALID_ARBITRARY_PURPOSE',
        requestedFields: ['name']
      }, {
        'Authorization': `Bearer ${citizen1Token}`
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.exchange.status, EXCHANGE_STATUS.REJECTED);
      assert.equal(res.data.exchange.rejectionCode, 'INVALID_PURPOSE');
    });

    it('rejects an unauthorized field request under approved purpose with HTTP 403', async () => {
      // Education Department attempting to request medical healthQuota from DigiLocker
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'DIGILOCKER',
        targetDepartment: 'EDUCATION',
        applicationId: 'APP-2026-TEST-004',
        purpose: 'ACADEMIC_ENROLLMENT_VERIFICATION',
        requestedFields: ['name', 'healthQuota', 'unrelatedSensitiveMedicalData']
      }, {
        'Authorization': `Bearer ${citizen1Token}`
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.exchange.status, EXCHANGE_STATUS.REJECTED);
      assert.equal(res.data.exchange.rejectionCode, 'UNAUTHORIZED_FIELD_REQUEST');
      assert.ok(res.data.exchange.rejectionReason.includes('not permitted under this policy'));
    });

    it('rejects exchange request when citizen technical consent is missing', async () => {
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'DIGILOCKER',
        targetDepartment: 'EDUCATION',
        applicationId: 'APP-2026-TEST-005',
        purpose: 'ACADEMIC_ENROLLMENT_VERIFICATION',
        requestedFields: ['name', 'dateOfBirth'],
        citizenConsentGiven: false
      }, {
        'Authorization': `Bearer ${citizen1Token}`
      });

      assert.equal(res.statusCode, 403);
      assert.equal(res.data.exchange.status, EXCHANGE_STATUS.REJECTED);
      assert.ok(res.data.exchange.rejectionReason.includes('consent not provided'));
    });
  });

  // 2. Data Minimization Engine
  describe('Data Minimization Engine', () => {
    it('minimizeData strips all non-permitted fields from canonical payload', () => {
      const canonicalRecord = {
        canonicalVersion: '1.0',
        citizenId: 'CIT-100234',
        name: 'Rohan Sharma',
        dateOfBirth: '1995-08-15',
        gender: 'MALE',
        mobile: '+91 98765 43210',
        address: {
          addressLine: '123 Civil Lines',
          district: 'Pune',
          state: 'Maharashtra',
          pincode: '411001'
        },
        revenueDetails: { annualIncome: 200000 },
        healthQuota: { rationCardNumber: 'RC-1234' }
      };

      // Only name and dateOfBirth are permitted
      const permitted = ['name', 'dateOfBirth'];
      const { minimizedData, strippedFields } = minimizeData(canonicalRecord, permitted);

      assert.equal(minimizedData.name, 'Rohan Sharma');
      assert.equal(minimizedData.dateOfBirth, '1995-08-15');
      assert.equal(minimizedData.canonicalVersion, '1.0');

      // Ensure stripped fields are completely absent
      assert.equal(minimizedData.citizenId, undefined);
      assert.equal(minimizedData.mobile, undefined);
      assert.equal(minimizedData.address, undefined);
      assert.equal(minimizedData.revenueDetails, undefined);
      assert.equal(minimizedData.healthQuota, undefined);

      assert.ok(strippedFields.includes('mobile'));
      assert.ok(strippedFields.includes('revenueDetails'));
      assert.ok(strippedFields.includes('healthQuota'));
    });
  });

  // 3. Execution, Transfer & Error Handling
  describe('Exchange Execution & Failure Handling', () => {
    let authorizedExchangeId = '';

    it('creates an authorized exchange request for execution', async () => {
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'REVENUE',
        targetDepartment: 'EDUCATION',
        applicationId: 'APP-2026-REV-099',
        purpose: 'INCOME_SCHOLARSHIP_VERIFICATION',
        requestedFields: ['citizenId', 'name', 'revenueDetails']
      }, {
        'Authorization': `Bearer ${citizen1Token}`,
        'X-Request-Id': 'req-exec-init'
      });

      assert.equal(res.statusCode, 201);
      authorizedExchangeId = res.data.exchange.exchangeId;
      assert.ok(authorizedExchangeId);
    });

    it('executes authorized exchange successfully and returns minimized data', async () => {
      const res = await request('POST', `/api/v1/exchange/requests/${authorizedExchangeId}/execute`, {
        sourceData: {
          applicant_nm: 'Rohan Sharma',
          d_o_b: '1995-08-15',
          mobile: '9876543210',
          khasra_no: 'KH-102',
          annual_inc: 140000,
          pin_code: '411001'
        }
      }, {
        'Authorization': `Bearer ${eduOfficerToken}`,
        'X-Request-Id': 'req-exec-run'
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.status, EXCHANGE_STATUS.COMPLETED);
      assert.ok(res.data.completedAt);
      assert.equal(res.data.minimizedData.name, 'Rohan Sharma');
      assert.equal(res.data.minimizedData.revenueDetails.annualIncome, 140000);
      // Ensure unrequested mobile and address are minimized out
      assert.equal(res.data.minimizedData.mobile, undefined);
      assert.equal(res.data.minimizedData.address, undefined);
    });

    it('handles simulated downstream timeout (HTTP 504) and records failure in audit', async () => {
      const init = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'DIGILOCKER',
        targetDepartment: 'TRANSPORT',
        applicationId: 'APP-2026-TRN-101',
        purpose: 'DRIVING_LICENSE_VERIFICATION',
        requestedFields: ['name', 'dateOfBirth']
      }, { 'Authorization': `Bearer ${citizen1Token}` });

      const timeoutExchangeId = init.data.exchange.exchangeId;

      const res = await request('POST', `/api/v1/exchange/requests/${timeoutExchangeId}/execute`, {
        simulateTimeout: true
      }, { 'Authorization': `Bearer ${adminToken}` });

      assert.equal(res.statusCode, 504);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Timeout'));

      const record = dataExchangeService.getExchangeById(timeoutExchangeId);
      assert.equal(record.status, EXCHANGE_STATUS.FAILED);
      assert.equal(record.retryCount, 1);
    });

    it('rejects execution of an expired data exchange request (HTTP 410)', async () => {
      const init = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'DIGILOCKER',
        targetDepartment: 'EDUCATION',
        applicationId: 'APP-2026-EXPIRE-TEST',
        purpose: 'ACADEMIC_ENROLLMENT_VERIFICATION',
        requestedFields: ['name']
      }, { 'Authorization': `Bearer ${citizen1Token}` });

      const expExchange = dataExchangeService.getExchangeById(init.data.exchange.exchangeId);
      // Manually backdate expiration timestamp
      expExchange.expiresAt = new Date(Date.now() - 5000).toISOString();

      const res = await request('POST', `/api/v1/exchange/requests/${expExchange.exchangeId}/execute`, {}, {
        'Authorization': `Bearer ${eduOfficerToken}`
      });

      assert.equal(res.statusCode, 410);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('expired'));
      assert.equal(expExchange.status, EXCHANGE_STATUS.EXPIRED);
    });
  });

  // 4. Role-Based Access Control (RBAC) & Security Boundaries
  describe('RBAC & Citizen Ownership Security Boundaries', () => {
    let citizen1ExchangeId = '';

    it('Citizen 1 creates an exchange linked to their application', async () => {
      const res = await request('POST', '/api/v1/exchange/requests', {
        sourceDepartment: 'EDUCATION',
        targetDepartment: 'FINANCE',
        applicationId: 'APP-2026-CIT1-OWN',
        purpose: 'SCHOLARSHIP_DISBURSEMENT_VALIDATION',
        requestedFields: ['citizenId', 'name', 'academicDetails']
      }, { 'Authorization': `Bearer ${citizen1Token}` });

      assert.equal(res.statusCode, 201);
      citizen1ExchangeId = res.data.exchange.exchangeId;
    });

    it('Citizen 1 can view their own exchange request (HTTP 200)', async () => {
      const res = await request('GET', `/api/v1/exchange/requests/${citizen1ExchangeId}`, null, {
        'Authorization': `Bearer ${citizen1Token}`
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.exchange.exchangeId, citizen1ExchangeId);
    });

    it('Citizen 2 CANNOT view Citizen 1 exchange request (HTTP 403 Forbidden)', async () => {
      const res = await request('GET', `/api/v1/exchange/requests/${citizen1ExchangeId}`, null, {
        'Authorization': `Bearer ${citizen2Token}`
      });
      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Access Denied'));
    });

    it('Education Officer can view exchange involving EDUCATION (HTTP 200)', async () => {
      const res = await request('GET', `/api/v1/exchange/requests/${citizen1ExchangeId}`, null, {
        'Authorization': `Bearer ${eduOfficerToken}`
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.exchange.exchangeId, citizen1ExchangeId);
    });

    it('Revenue Officer CANNOT access exchange involving EDUCATION -> FINANCE (HTTP 403 Forbidden)', async () => {
      const res = await request('GET', `/api/v1/exchange/requests/${citizen1ExchangeId}`, null, {
        'Authorization': `Bearer ${revOfficerToken}`
      });
      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('assigned department'));
    });

    it('Admin can view all exchanges and query audit trails (HTTP 200)', async () => {
      const res = await request('GET', '/api/v1/exchange/audit', null, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.logs));
      assert.ok(res.data.count > 0);
    });

    it('Citizen attempting to access exchange audit log is REJECTED (HTTP 403 Forbidden)', async () => {
      const res = await request('GET', '/api/v1/exchange/audit', null, {
        'Authorization': `Bearer ${citizen1Token}`
      });
      assert.equal(res.statusCode, 403);
      assert.equal(res.data.success, false);
    });
  });

  // 5. Exchange Policy Discovery Endpoint
  describe('Exchange Policy Registry Endpoint', () => {
    it('GET /api/v1/exchange/policies returns complete active policy matrix', async () => {
      const res = await request('GET', '/api/v1/exchange/policies');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.policies['DIGILOCKER->EDUCATION']);
      assert.ok(res.data.policies['REVENUE->EDUCATION']);
      assert.ok(res.data.policies['EDUCATION->FINANCE']);
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
