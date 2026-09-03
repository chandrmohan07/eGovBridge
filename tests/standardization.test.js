import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import {
  CANONICAL_VERSION,
  SCHEMAS,
  normalizeDate,
  normalizePhone,
  normalizePincode,
  normalizeAddress,
  normalizeGender,
  normalizeStatus,
  validateCitizen,
  validateAddress,
  validateApplication,
  DepartmentMappers,
  normalizeDepartmentPayload,
  transformCanonicalToDepartment
} from '../server/standardization/index.js';
import { adapterRegistry } from '../server/adapters/adapter-registry.js';

describe('Phase 9 — Data Standardization & Canonical Models Verification', () => {
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

  it('Start dev server with Data Standardization Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // 1. Normalization Utilities
  describe('Canonical Field Normalization Utilities', () => {
    it('normalizeDate correctly normalizes diverse date formats to YYYY-MM-DD', () => {
      assert.equal(normalizeDate('15-08-1995'), '1995-08-15');
      assert.equal(normalizeDate('01/01/2000'), '2000-01-01');
      assert.equal(normalizeDate('2026-09-03'), '2026-09-03');
      assert.equal(normalizeDate('2026/09/03'), '2026-09-03');
      assert.equal(normalizeDate(new Date('1998-05-20T00:00:00Z')), '1998-05-20');
      assert.equal(normalizeDate('invalid-date'), null);
      assert.equal(normalizeDate(null), null);
    });

    it('normalizePhone normalizes 10-digit Indian numbers, leading zeros, and prefixes', () => {
      assert.equal(normalizePhone('9876543210'), '+91 98765 43210');
      assert.equal(normalizePhone('09876543210'), '+91 98765 43210');
      assert.equal(normalizePhone('919876543210'), '+91 98765 43210');
      assert.equal(normalizePhone('+91 98765 43210'), '+91 98765 43210');
      // Invalid numbers (wrong length or starting digit < 6)
      assert.equal(normalizePhone('1234567890'), null);
      assert.equal(normalizePhone('98765'), null);
      assert.equal(normalizePhone(null), null);
    });

    it('normalizePincode enforces valid 6-digit Indian PIN codes', () => {
      assert.equal(normalizePincode('411005'), '411005');
      assert.equal(normalizePincode(' 110001 '), '110001');
      assert.equal(normalizePincode('011001'), null); // Leading zero invalid
      assert.equal(normalizePincode('41100'), null);   // 5 digits invalid
      assert.equal(normalizePincode('4110055'), null); // 7 digits invalid
    });

    it('normalizeGender standardizes gender variations', () => {
      assert.equal(normalizeGender('M'), 'MALE');
      assert.equal(normalizeGender('Male'), 'MALE');
      assert.equal(normalizeGender('F'), 'FEMALE');
      assert.equal(normalizeGender('female'), 'FEMALE');
      assert.equal(normalizeGender('TG'), 'TRANSGENDER');
      assert.equal(normalizeGender(null), 'OTHER');
    });

    it('normalizeAddress normalizes strings or nested address structures', () => {
      const fromString = normalizeAddress('Flat 101, MG Road, Pune');
      assert.equal(fromString.addressLine, 'Flat 101, MG Road, Pune');
      assert.equal(fromString.district, 'Pune');
      assert.equal(fromString.pincode, '411001');

      const fromObj = normalizeAddress({
        street: '402 Model Colony',
        city: 'Pune',
        dist: 'Pune',
        state: 'Maharashtra',
        zip: '411016'
      });
      assert.equal(fromObj.addressLine, '402 Model Colony');
      assert.equal(fromObj.district, 'Pune');
      assert.equal(fromObj.pincode, '411016');
    });

    it('normalizeStatus normalizes department-specific status strings', () => {
      assert.equal(normalizeStatus('APPROVED'), 'COMPLETED');
      assert.equal(normalizeStatus('CLEARED'), 'COMPLETED');
      assert.equal(normalizeStatus('VERIFIED'), 'COMPLETED');
      assert.equal(normalizeStatus('REJECTED'), 'FAILED');
      assert.equal(normalizeStatus('DISMISSED'), 'FAILED');
      assert.equal(normalizeStatus('IN_REVIEW'), 'IN_PROGRESS');
      assert.equal(normalizeStatus('PENDING_VERIFICATION'), 'PENDING');
    });
  });

  // 2. Canonical Model Validation
  describe('Canonical Schema & Data Validation', () => {
    const validAddress = {
      addressLine: '123 Civil Lines',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411001'
    };

    const validCitizen = {
      citizenId: 'CIT-100234',
      name: 'Rohan Sharma',
      dateOfBirth: '1995-08-15',
      gender: 'MALE',
      mobile: '+91 98765 43210',
      email: 'rohan.sharma@example.com',
      address: validAddress
    };

    it('validateAddress passes with valid address payload', () => {
      const res = validateAddress(validAddress);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
    });

    it('validateAddress rejects missing required fields and invalid pincode', () => {
      const res = validateAddress({ addressLine: 'Hi', pincode: 'abc' });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some(e => e.field === 'address.addressLine'));
      assert.ok(res.errors.some(e => e.field === 'address.district'));
      assert.ok(res.errors.some(e => e.field === 'address.state'));
      assert.ok(res.errors.some(e => e.field === 'address.pincode'));
    });

    it('validateCitizen passes with complete canonical citizen object', () => {
      const res = validateCitizen(validCitizen);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
    });

    it('validateCitizen rejects missing name, invalid date format, and unnormalized phone', () => {
      const res = validateCitizen({
        citizenId: 'CIT-999',
        name: '',
        dateOfBirth: '15/08/1995', // Non-canonical format
        mobile: '9876543210',      // Non-canonical format (+91 XXXXX XXXXX required)
        address: validAddress
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some(e => e.field === 'name'));
      assert.ok(res.errors.some(e => e.field === 'dateOfBirth'));
      assert.ok(res.errors.some(e => e.field === 'mobile'));
    });

    it('validateApplication validates complete canonical application', () => {
      const app = {
        canonicalVersion: CANONICAL_VERSION,
        applicationId: 'APP-2026-X9Y8Z7',
        citizenId: 'CIT-100234',
        serviceId: 'SRV-EDU-001',
        departmentCode: 'EDUCATION',
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        documents: [
          {
            documentId: 'DOC-01',
            documentType: 'INCOME_CERTIFICATE',
            verificationStatus: 'VERIFIED'
          }
        ]
      };

      const res = validateApplication(app);
      assert.equal(res.valid, true);
    });

    it('validateApplication rejects unsupported schema versions', () => {
      const app = {
        canonicalVersion: '99.0', // Unsupported version
        applicationId: 'APP-2026-X9Y8Z7',
        citizenId: 'CIT-100234',
        serviceId: 'SRV-EDU-001',
        departmentCode: 'EDUCATION',
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      };

      const res = validateApplication(app);
      assert.equal(res.valid, false);
      assert.ok(res.errors.some(e => e.code === 'UNSUPPORTED_VERSION'));
    });
  });

  // 3. Department Bidirectional Mappers
  describe('Department Bidirectional Mappers (Two Disparate Formats -> One Canonical Format)', () => {
    it('Department A (DigiLocker) & Department B (Education) map to identical canonical structure', () => {
      // Department A format
      const deptA = {
        uid_ref: 'AADH-998877',
        full_name: 'Pooja Verma',
        dob_ddmmyyyy: '12-04-1998',
        gender_code: 'F',
        phone_number: '9876512345',
        permanent_addr: 'Plot 45, Gandhi Nagar, Pune'
      };

      // Department B format
      const deptB = {
        student_id: 'STUD-554433',
        candidate_name: 'Pooja Verma',
        birth_dt: '1998/04/12',
        gender: 'Female',
        contact_no: '09876512345',
        residential_address: 'Plot 45, Gandhi Nagar, Pune'
      };

      const canonicalA = DepartmentMappers.Identity.toCanonical(deptA);
      const canonicalB = DepartmentMappers.Education.toCanonical(deptB);

      // Both map to identical canonical fields
      assert.equal(canonicalA.name, canonicalB.name);
      assert.equal(canonicalA.dateOfBirth, '1998-04-12');
      assert.equal(canonicalB.dateOfBirth, '1998-04-12');
      assert.equal(canonicalA.gender, 'FEMALE');
      assert.equal(canonicalB.gender, 'FEMALE');
      assert.equal(canonicalA.mobile, '+91 98765 12345');
      assert.equal(canonicalB.mobile, '+91 98765 12345');
      assert.equal(canonicalA.canonicalVersion, CANONICAL_VERSION);
      assert.equal(canonicalB.canonicalVersion, CANONICAL_VERSION);
    });

    it('HealthMapper bidirectional mapping', () => {
      const deptPayload = {
        beneficiary_id: 'PMJAY-123456',
        beneficiary_name: 'Vikram Singh',
        dob: '10-10-1980',
        gender: 'M',
        mobile_num: '9822012345',
        ration_card_no: 'RC-MH-9988',
        secc_category: 'D3'
      };

      const canonical = DepartmentMappers.Health.toCanonical(deptPayload);
      assert.equal(canonical.name, 'Vikram Singh');
      assert.equal(canonical.dateOfBirth, '1980-10-10');
      assert.equal(canonical.mobile, '+91 98220 12345');
      assert.equal(canonical.healthQuota.rationCardNumber, 'RC-MH-9988');

      // Transform back to department format
      const back = DepartmentMappers.Health.fromCanonical(canonical);
      assert.equal(back.beneficiary_name, 'Vikram Singh');
      assert.equal(back.ration_card_no, 'RC-MH-9988');
    });

    it('RevenueMapper bidirectional mapping', () => {
      const deptPayload = {
        applicant_nm: 'Sunita Patil',
        d_o_b: '1975-03-25',
        mobile: '9765432100',
        khasra_no: 'KH-402/A',
        annual_inc: '120000',
        tehsil_name: 'Haveli',
        district_name: 'Pune',
        state_name: 'Maharashtra',
        pin_code: '411028'
      };

      const canonical = DepartmentMappers.Revenue.toCanonical(deptPayload);
      assert.equal(canonical.name, 'Sunita Patil');
      assert.equal(canonical.revenueDetails.khasraNumber, 'KH-402/A');
      assert.equal(canonical.revenueDetails.annualIncome, 120000);
      assert.equal(canonical.address.pincode, '411028');

      const back = DepartmentMappers.Revenue.fromCanonical(canonical);
      assert.equal(back.applicant_nm, 'Sunita Patil');
      assert.equal(back.khasra_no, 'KH-402/A');
    });

    it('TransportMapper bidirectional mapping', () => {
      const deptPayload = {
        dl_number: 'MH12-20150001234',
        dl_applicant_name: 'Amit Deshmukh',
        date_of_birth: '1990-11-12',
        cell_number: '919876599999',
        residential_address: 'Kothrud, Pune',
        rto_office_code: 'MH12',
        vehicle_class: 'LMV'
      };

      const canonical = DepartmentMappers.Transport.toCanonical(deptPayload);
      assert.equal(canonical.name, 'Amit Deshmukh');
      assert.equal(canonical.mobile, '+91 98765 99999');
      assert.equal(canonical.transportDetails.rtoCode, 'MH12');

      const back = DepartmentMappers.Transport.fromCanonical(canonical);
      assert.equal(back.dl_applicant_name, 'Amit Deshmukh');
      assert.equal(back.rto_office_code, 'MH12');
    });

    it('WelfareMapper bidirectional mapping', () => {
      const deptPayload = {
        beneficiary_code: 'BENEF-888',
        beneficiary_name: 'Lakshmi Nair',
        dob: '1985-06-15',
        contact_mobile: '9844011223',
        account_no: '123456789012',
        bank_ifsc: 'SBIN0001234',
        scheme_code: 'SCH-NSP-POSTMATRIC'
      };

      const canonical = DepartmentMappers.Welfare.toCanonical(deptPayload);
      assert.equal(canonical.name, 'Lakshmi Nair');
      assert.equal(canonical.financialDetails.accountNumberMasked, 'XXXX-9012');
      assert.equal(canonical.financialDetails.schemeCode, 'SCH-NSP-POSTMATRIC');

      const back = DepartmentMappers.Welfare.fromCanonical(canonical);
      assert.equal(back.beneficiary_name, 'Lakshmi Nair');
      assert.equal(back.scheme_code, 'SCH-NSP-POSTMATRIC');
    });
  });

  // 4. BaseAdapter Integration with Canonical Transformation
  describe('Phase 8 Adapter Integration with Canonical Translation', () => {
    it('BaseAdapter provides toCanonical and fromCanonical helpers', () => {
      const eduAdapter = adapterRegistry.getAdapter('EDU_ADAPTER');
      assert.ok(eduAdapter);

      const deptData = {
        student_name: 'Anjali Sharma',
        birth_dt: '2001-09-18',
        contact_no: '9876543210'
      };

      const canonical = eduAdapter.toCanonical(deptData);
      assert.equal(canonical.name, 'Anjali Sharma');
      assert.equal(canonical.mobile, '+91 98765 43210');
      assert.equal(canonical.canonicalVersion, CANONICAL_VERSION);

      const back = eduAdapter.fromCanonical(canonical);
      assert.equal(back.student_name, 'Anjali Sharma');
    });
  });

  // 5. REST APIs for Data Standardization
  describe('API Gateway Standardization Endpoints', () => {
    it('GET /api/v1/standardization/schemas returns canonical version and schema definitions', async () => {
      const res = await request('GET', '/api/v1/standardization/schemas');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.version, CANONICAL_VERSION);
      assert.ok(res.data.schemas.Citizen);
      assert.ok(res.data.schemas.Address);
      assert.ok(res.data.schemas.Application);
      assert.ok(res.data.requestId);
    });

    it('POST /api/v1/standardization/validate accepts valid canonical payload', async () => {
      const res = await request('POST', '/api/v1/standardization/validate', {
        type: 'Citizen',
        data: {
          citizenId: 'CIT-777',
          name: 'Priya Joshi',
          dateOfBirth: '1996-03-12',
          gender: 'FEMALE',
          mobile: '+91 98765 43210',
          address: {
            addressLine: '501 Deccan Gymkhana',
            district: 'Pune',
            state: 'Maharashtra',
            pincode: '411004'
          }
        }
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.valid, true);
    });

    it('POST /api/v1/standardization/validate rejects invalid payload with HTTP 422', async () => {
      const res = await request('POST', '/api/v1/standardization/validate', {
        type: 'Citizen',
        data: {
          citizenId: 'CIT-777',
          name: 'P', // Too short
          mobile: 'invalid-phone'
        }
      });

      assert.equal(res.statusCode, 422);
      assert.equal(res.data.valid, false);
      assert.ok(Array.isArray(res.data.errors));
      assert.ok(res.data.errors.some(e => e.field === 'name'));
      assert.ok(res.data.errors.some(e => e.field === 'mobile'));
    });

    it('POST /api/v1/standardization/normalize normalizes department payload to canonical', async () => {
      const res = await request('POST', '/api/v1/standardization/normalize', {
        department: 'EDUCATION',
        data: {
          student_name: 'Kunal Patil',
          birth_dt: '14-02-1999',
          contact_no: '9876512345',
          residential_address: 'FC Road, Pune'
        }
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.canonical.name, 'Kunal Patil');
      assert.equal(res.data.canonical.dateOfBirth, '1999-02-14');
      assert.equal(res.data.canonical.mobile, '+91 98765 12345');
      assert.equal(res.data.canonicalVersion, CANONICAL_VERSION);
    });

    it('POST /api/v1/standardization/transform converts canonical data into target department format', async () => {
      const res = await request('POST', '/api/v1/standardization/transform', {
        targetDepartment: 'REVENUE',
        canonical: {
          name: 'Kunal Patil',
          dateOfBirth: '1999-02-14',
          mobile: '+91 98765 12345',
          revenueDetails: { khasraNumber: 'KH-88', annualIncome: 250000 }
        }
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.applicant_nm, 'Kunal Patil');
      assert.equal(res.data.data.khasra_no, 'KH-88');
      assert.equal(res.data.data.annual_inc, 250000);
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
