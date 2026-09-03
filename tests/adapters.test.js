import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { adapterRegistry } from '../server/adapters/adapter-registry.js';
import { BaseAdapter } from '../server/adapters/base-adapter.js';

describe('Phase 8 — Department Integration Adapter Layer Verification', () => {
  let server;
  let port;

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

  it('Start dev server with API Gateway and Adapter Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // 1. Adapter Registry & Factory Pattern
  describe('Adapter Registry, Discovery & Configuration', () => {
    it('initializes standard department adapters across key government domains', () => {
      const adapters = adapterRegistry.listAdapters();
      assert.ok(adapters.length >= 6);

      const codes = adapters.map(a => a.code);
      assert.ok(codes.includes('DIGILOCKER_ADAPTER'));
      assert.ok(codes.includes('EDU_ADAPTER'));
      assert.ok(codes.includes('HLT_ADAPTER'));
      assert.ok(codes.includes('REV_ADAPTER'));
      assert.ok(codes.includes('TRN_ADAPTER'));
      assert.ok(codes.includes('PFMS_ADAPTER'));

      // All adapters should be clearly labeled as mock/sandbox
      for (const a of adapters) {
        assert.equal(a.isMock, true);
        assert.equal(a.mode, 'MOCK_SANDBOX');
      }
    });

    it('resolves adapters by code or department alias', () => {
      const eduByCode = adapterRegistry.getAdapter('EDU_ADAPTER');
      const eduByDept = adapterRegistry.getAdapter('EDUCATION');
      assert.ok(eduByCode);
      assert.strictEqual(eduByCode, eduByDept);

      const revByAlias = adapterRegistry.getAdapter('LAND_RECORDS');
      assert.ok(revByAlias);
      assert.equal(revByAlias.code, 'REV_ADAPTER');
    });

    it('returns null gracefully for non-existent department adapter', () => {
      const missing = adapterRegistry.getAdapter('NON_EXISTENT_DEPARTMENT');
      assert.equal(missing, null);
    });

    it('supports runtime enable and disable toggling of adapters', async () => {
      assert.equal(adapterRegistry.isAdapterEnabled('TRN_ADAPTER'), true);

      adapterRegistry.disableAdapter('TRN_ADAPTER');
      assert.equal(adapterRegistry.isAdapterEnabled('TRN_ADAPTER'), false);

      const adapter = adapterRegistry.getAdapter('TRN_ADAPTER');
      const result = await adapter.executeTask({ code: 'TASK_VERIFY', title: 'Test Task' });
      assert.equal(result.success, false);
      assert.equal(result.error.code, 'ADAPTER_DISABLED');

      // Re-enable for subsequent tests
      adapterRegistry.enableAdapter('TRN_ADAPTER');
      assert.equal(adapterRegistry.isAdapterEnabled('TRN_ADAPTER'), true);
    });
  });

  // 2. Department Mock Adapters Deep-Dive
  describe('Department Mock / Sandbox Adapters Execution', () => {
    it('IdentityAdapter executes e-KYC and DigiLocker credential check', async () => {
      const adapter = adapterRegistry.getAdapter('DIGILOCKER_ADAPTER');
      const res = await adapter.verify({ aadhaar: 'XXXX-XXXX-4819' }, { requestId: 'req-id-test' });

      assert.equal(res.success, true);
      assert.equal(res.adapterCode, 'DIGILOCKER_ADAPTER');
      assert.equal(res.data.verdict, 'APPROVED');
      assert.equal(res.data.kycStatus, 'VERIFIED');
      assert.ok(res.referenceId.startsWith('REF-DIG-'));
      assert.equal(res.isMock, true);
    });

    it('EducationAdapter validates university board records', async () => {
      const adapter = adapterRegistry.getAdapter('EDU_ADAPTER');
      const res = await adapter.verify({ institution: 'Pune University', marks: 85.0 });

      assert.equal(res.success, true);
      assert.equal(res.adapterCode, 'EDU_ADAPTER');
      assert.equal(res.data.verdict, 'APPROVED');
      assert.equal(res.data.institutionStatus, 'RECOGNIZED_UGC_AICTE');
      assert.ok(res.referenceId.startsWith('REF-EDU-'));
    });

    it('HealthAdapter checks SECC quota and generates Ayushman Golden Card token', async () => {
      const adapter = adapterRegistry.getAdapter('HLT_ADAPTER');
      const res = await adapter.executeTask({
        code: 'TASK_GOLDEN_CARD_ISSUE',
        title: 'Generate Golden Card'
      });

      assert.equal(res.success, true);
      assert.equal(res.adapterCode, 'HLT_ADAPTER');
      assert.equal(res.data.verdict, 'APPROVED');
      assert.ok(res.data.goldenCardToken.startsWith('GCARD-2026-'));
    });

    it('RevenueAdapter verifies land records (Bhulekh) and digital signature', async () => {
      const adapter = adapterRegistry.getAdapter('REV_ADAPTER');
      const res = await adapter.executeTask({
        code: 'TASK_TEHSILDAR_DIGITAL_SIGN',
        title: 'Tehsildar Digital Sign'
      });

      assert.equal(res.success, true);
      assert.equal(res.adapterCode, 'REV_ADAPTER');
      assert.equal(res.data.landRecordStatus, 'BHULEKH_MUTATION_VERIFIED');
      assert.equal(res.data.tehsildarDigitalSignature, 'VALID_PKI_X509_CERT_ATTACHED');
    });

    it('TransportAdapter verifies Sarathi driving license records', async () => {
      const adapter = adapterRegistry.getAdapter('TRN_ADAPTER');
      const res = await adapter.executeTask({
        code: 'TASK_DL_VERIFY',
        title: 'Verify Driving License'
      });

      assert.equal(res.success, true);
      assert.equal(res.adapterCode, 'TRN_ADAPTER');
      assert.equal(res.data.licenseStatus, 'VALID_AND_ACTIVE');
      assert.ok(res.data.rtoJurisdiction);
    });

    it('WelfareAdapter checks PFMS NPCI mapper and generates DBT reference', async () => {
      const adapter = adapterRegistry.getAdapter('PFMS_ADAPTER');
      const res = await adapter.executeTask({
        code: 'TASK_DISBURSEMENT_SANCTION',
        title: 'Sanction DBT Grant'
      });

      assert.equal(res.success, true);
      assert.equal(res.adapterCode, 'PFMS_ADAPTER');
      assert.equal(res.data.bankAccountAadhaarLinked, true);
      assert.ok(res.data.dbtBatchReference.startsWith('DBT-2026-PFMS-'));
    });
  });

  // 3. Error Handling & Timeout Simulation
  describe('Adapter Error Handling & Simulation Failures', () => {
    it('handles simulated downstream timeout gracefully', async () => {
      const adapter = adapterRegistry.getAdapter('EDU_ADAPTER');
      const res = await adapter.executeTask(
        { code: 'TASK_ACADEMIC_RECORD', title: 'Academic Check' },
        { simulateTimeout: true }
      );

      assert.equal(res.success, false);
      assert.equal(res.status, 'FAILED');
      assert.equal(res.error.code, 'TIMEOUT');
      assert.ok(res.error.message.includes('timed out'));
    });

    it('handles simulated verification rejection with standardized failure payload', async () => {
      const adapter = adapterRegistry.getAdapter('REV_ADAPTER');
      const res = await adapter.executeTask(
        { code: 'TASK_REVENUE_INSPECTION', title: 'Revenue Check' },
        { 
          simulateFailureTask: 'TASK_REVENUE_INSPECTION',
          failureReason: 'Annual income exceeds quota ceiling'
        }
      );

      assert.equal(res.success, false);
      assert.equal(res.status, 'FAILED');
      assert.equal(res.error.code, 'VERIFICATION_REJECTED');
      assert.equal(res.error.message, 'Annual income exceeds quota ceiling');
    });

    it('executes health checks across all registered adapters', async () => {
      const healthMap = await adapterRegistry.healthCheckAll();
      assert.ok(healthMap['DIGILOCKER_ADAPTER']);
      assert.equal(healthMap['DIGILOCKER_ADAPTER'].status, 'HEALTHY');
      assert.equal(healthMap['DIGILOCKER_ADAPTER'].mode, 'MOCK_SANDBOX');
      assert.equal(healthMap['EDU_ADAPTER'].status, 'HEALTHY');
    });
  });

  // 4. REST APIs through API Gateway
  describe('Gateway REST Endpoints for Department Adapters', () => {
    let citizenToken = '';

    it('Setup: Register Citizen for Authenticated API Tests', async () => {
      const reg = await request('POST', '/api/v1/auth/register', {
        name: 'Adapter Tester',
        email: `adapter_cit_${Date.now()}@example.com`,
        password: 'Password@123',
        phone: '+91 98765 88888',
        state: 'Maharashtra',
        district: 'Pune'
      });
      assert.equal(reg.statusCode, 201);
      citizenToken = reg.data.token;
    });

    it('GET /api/v1/adapters lists all registered department adapters with requestId', async () => {
      const res = await request('GET', '/api/v1/adapters');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.count >= 6);
      assert.ok(Array.isArray(res.data.adapters));
      assert.ok(res.data.requestId);
      assert.equal(res.headers['x-request-id'], res.data.requestId);
    });

    it('GET /api/v1/adapters/:code/health returns health status of target adapter', async () => {
      const res = await request('GET', '/api/v1/adapters/EDU_ADAPTER/health');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.health.adapterCode, 'EDU_ADAPTER');
      assert.equal(res.data.health.status, 'HEALTHY');
      assert.equal(res.data.health.mode, 'MOCK_SANDBOX');
    });

    it('GET /api/v1/adapters/:code/health returns HTTP 404 for unknown adapter', async () => {
      const res = await request('GET', '/api/v1/adapters/UNKNOWN_ADAPTER/health');
      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Department adapter not found'));
    });

    it('POST /api/v1/adapters/:code/execute allows direct execution through gateway', async () => {
      const res = await request('POST', '/api/v1/adapters/DIGILOCKER_ADAPTER/execute', {
        task: { code: 'TASK_IDENTITY_VERIFY', title: 'Direct Gateway Test' }
      }, {
        'Authorization': `Bearer ${citizenToken}`,
        'X-Request-Id': 'adapter-trace-123'
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.adapterCode, 'DIGILOCKER_ADAPTER');
      assert.equal(res.data.data.verdict, 'APPROVED');
      assert.equal(res.data.requestId, 'adapter-trace-123');
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
