import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { store } from '../public/js/store.js';
import { renderApplicationWorkflow } from '../public/js/components/ApplicationWorkflow.js';

describe('Phase 5 — Unified Application Workflow Verification', () => {
  let server;
  let port;

  const request = (method, pathUrl, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: pathUrl,
        method,
        headers
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
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  };

  it('Start dev server for workflow tests', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // 1. Authentication & Security Guards
  describe('Authentication & Route Protection', () => {
    it('unauthenticated POST to /api/v1/applications must return 401 Unauthorized', async () => {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001'
      });
      assert.equal(res.statusCode, 401);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('token missing'));
    });

    it('unauthenticated GET to /api/v1/applications must return 401 Unauthorized', async () => {
      const res = await request('GET', '/api/v1/applications');
      assert.equal(res.statusCode, 401);
    });
  });

  // 2. Citizen Application Lifecycle & Validation
  describe('Citizen Application Lifecycle & Form Validation', () => {
    let citizenToken = '';
    let citizen2Token = '';
    let createdAppId = '';
    const email1 = `workflow_cit1_${Date.now()}@example.com`;
    const email2 = `workflow_cit2_${Date.now()}@example.com`;

    it('Setup: Register Citizen 1 and Citizen 2', async () => {
      const reg1 = await request('POST', '/api/v1/auth/register', {
        name: 'Aarav Sharma',
        email: email1,
        password: 'Password@123',
        phone: '+91 98765 11111',
        state: 'Maharashtra',
        district: 'Pune'
      });
      assert.equal(reg1.statusCode, 201);
      citizenToken = reg1.data.token;

      const reg2 = await request('POST', '/api/v1/auth/register', {
        name: 'Meera Rao',
        email: email2,
        password: 'Password@123',
        phone: '+91 98765 22222',
        state: 'Karnataka',
        district: 'Bengaluru'
      });
      assert.equal(reg2.statusCode, 201);
      citizen2Token = reg2.data.token;
    });

    it('rejection when service ID is invalid', async () => {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-NONEXISTENT-999',
        formData: { fullName: 'Aarav Sharma' },
        status: 'SUBMITTED'
      }, citizenToken);

      assert.equal(res.statusCode, 404);
      assert.ok(res.data.error.includes('Service not found'));
    });

    it('rejection on final submission when required applicant information is missing', async () => {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001',
        formData: {
          fullName: 'A', // too short
          email: 'invalid-email-format',
          phone: '123', // invalid phone
          address: '', // missing
          district: '',
          state: ''
        },
        status: 'SUBMITTED'
      }, citizenToken);

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.ok(Array.isArray(res.data.errors));
      assert.ok(res.data.errors.some(e => e.includes('Full name is required')));
      assert.ok(res.data.errors.some(e => e.includes('valid email')));
      assert.ok(res.data.errors.some(e => e.includes('mobile number')));
      assert.ok(res.data.errors.some(e => e.includes('address is required')));
    });

    it('rejection when uploaded document contains an insecure executable extension', async () => {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-REV-002',
        formData: {
          fullName: 'Aarav Sharma',
          email: 'aarav@example.com',
          phone: '+91 98765 11111',
          address: '123 Main Road, Pune',
          district: 'Pune',
          state: 'Maharashtra',
          annualIncome: '180000',
          occupation: 'Private Service',
          purpose: 'Scholarship Application'
        },
        documents: [
          {
            name: 'Salary Slip',
            fileName: 'payload_script.exe',
            fileSize: 1024,
            status: 'Uploaded'
          }
        ],
        status: 'SUBMITTED'
      }, citizenToken);

      assert.equal(res.statusCode, 400);
      assert.ok(res.data.errors.some(e => e.includes('Insecure file type')));
    });

    it('rejection when uploaded document exceeds 5 MB size threshold', async () => {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-REV-002',
        formData: {
          fullName: 'Aarav Sharma',
          email: 'aarav@example.com',
          phone: '+91 98765 11111',
          address: '123 Main Road, Pune',
          district: 'Pune',
          state: 'Maharashtra',
          annualIncome: '180000',
          occupation: 'Private Service',
          purpose: 'Scholarship Application'
        },
        documents: [
          {
            name: 'Salary Slip',
            fileName: 'massive_scan.pdf',
            fileSize: 10 * 1024 * 1024, // 10MB
            status: 'Uploaded'
          }
        ],
        status: 'SUBMITTED'
      }, citizenToken);

      assert.equal(res.statusCode, 400);
      assert.ok(res.data.errors.some(e => e.includes('exceeds the 5 MB limit')));
    });

    it('Citizen 1 can successfully save an in-progress draft (status: DRAFT)', async () => {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001',
        formData: {
          fullName: 'Aarav Sharma',
          email: 'aarav@example.com',
          institution: 'Pune University'
        },
        documents: [],
        status: 'DRAFT'
      }, citizenToken);

      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.application.status, 'DRAFT');
      assert.ok(res.data.application.id.startsWith('APP-2026-EDU-'));
      assert.equal(res.data.application.submittedAt, null);
      createdAppId = res.data.application.id;
    });

    it('Citizen 1 can update an existing draft (PUT /api/v1/applications/:id)', async () => {
      const res = await request('PUT', `/api/v1/applications/${createdAppId}`, {
        formData: {
          phone: '+91 98765 11111',
          course: 'B.Tech IT',
          annualIncome: '200000',
          previousMarks: '88.5',
          address: '123 Main Road, Pune',
          district: 'Pune',
          state: 'Maharashtra'
        },
        documents: [
          {
            name: 'Income Certificate',
            fileName: 'income_cert.pdf',
            fileSize: 250000,
            status: 'Uploaded'
          }
        ]
      }, citizenToken);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.application.formData.course, 'B.Tech IT');
      assert.equal(res.data.application.documents.length, 1);
    });

    it('Citizen 1 can submit the completed draft (POST /api/v1/applications/:id/submit)', async () => {
      const res = await request('POST', `/api/v1/applications/${createdAppId}/submit`, null, citizenToken);
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.application.status, 'SUBMITTED');
      assert.ok(res.data.application.submittedAt);
      assert.equal(res.data.application.submittedDate, new Date().toISOString().slice(0, 10));
    });

    it('rejection when attempting to edit an already submitted application', async () => {
      const res = await request('PUT', `/api/v1/applications/${createdAppId}`, {
        formData: { course: 'Hacked Course' }
      }, citizenToken);

      assert.equal(res.statusCode, 400);
      assert.ok(res.data.error.includes('already submitted'));
    });

    // 3. Citizen Ownership Enforcement
    it('Citizen 2 CANNOT access Citizen 1 application (returns HTTP 403 Forbidden)', async () => {
      const res = await request('GET', `/api/v1/applications/${createdAppId}`, null, citizen2Token);
      assert.equal(res.statusCode, 403);
      assert.ok(res.data.error.includes('Access Denied'));
    });

    it('Citizen 2 CANNOT modify Citizen 1 application (returns HTTP 403 Forbidden)', async () => {
      const res = await request('PUT', `/api/v1/applications/${createdAppId}`, {
        formData: { fullName: 'Malicious Change' }
      }, citizen2Token);
      assert.equal(res.statusCode, 403);
    });

    it('Citizen 1 can list their own applications (GET /api/v1/applications)', async () => {
      const res = await request('GET', '/api/v1/applications', null, citizenToken);
      assert.equal(res.statusCode, 200);
      assert.ok(res.data.count >= 1);
      assert.ok(res.data.applications.some(a => a.id === createdAppId));
    });
  });

  // 4. UI Component Rendering Verification
  describe('UI Component Rendering: Multi-Step Workflow', () => {
    it('renderApplicationWorkflow renders empty state when no draft session is active', () => {
      store.activeApplicationDraft = null;
      const html = renderApplicationWorkflow(store);
      assert.ok(html.includes('No Active Application Session'));
      assert.ok(html.includes('Explore Service Catalog'));
    });

    it('renderApplicationWorkflow renders Step 1: Applicant Information', () => {
      store.activeApplicationDraft = {
        serviceId: 'SRV-EDU-001',
        service: store.services.find(s => s.id === 'SRV-EDU-001'),
        step: 1,
        formData: {
          fullName: 'Rahul Verma',
          email: 'citizen@example.com',
          phone: '+91 98765 43210',
          address: 'Shivaji Nagar',
          state: 'Maharashtra',
          district: 'Pune'
        },
        documents: [],
        errors: []
      };

      const html = renderApplicationWorkflow(store);
      assert.ok(html.includes('Step 1: Citizen Identity & Contact Details'));
      assert.ok(html.includes('Full Legal Name'));
      assert.ok(html.includes('Aadhaar ID (Masked)'));
      assert.ok(html.includes('Next: Service Details →'));
    });

    it('renderApplicationWorkflow renders Step 2: Service Requirements', () => {
      store.activeApplicationDraft.step = 2;
      const html = renderApplicationWorkflow(store);
      assert.ok(html.includes('Step 2: Service-Specific Requirements'));
      assert.ok(html.includes('Institution / University Name'));
      assert.ok(html.includes('Enrolled Course / Degree'));
      assert.ok(html.includes('Next: Upload Documents →'));
    });

    it('renderApplicationWorkflow renders Step 3: Document Uploads', () => {
      store.activeApplicationDraft.step = 3;
      const html = renderApplicationWorkflow(store);
      assert.ok(html.includes('Step 3: Document Uploads & Verification'));
      assert.ok(html.includes('Income Certificate'));
      assert.ok(html.includes('Next: Review Application →'));
    });

    it('renderApplicationWorkflow renders Step 4: Review & Consent', () => {
      store.activeApplicationDraft.step = 4;
      store.activeApplicationDraft.documents = [
        { name: 'Income Certificate', fileName: 'income.pdf', fileSize: 400000 }
      ];
      const html = renderApplicationWorkflow(store);
      assert.ok(html.includes('Step 4: Application Review & Consent Declaration'));
      assert.ok(html.includes('I solemnly declare that all particulars'));
      assert.ok(html.includes('Submit Final Application'));
    });

    it('renderApplicationWorkflow renders Step 5: Submission Confirmation', () => {
      store.activeApplicationDraft.step = 5;
      store.activeApplicationDraft.submittedApp = {
        id: 'APP-2026-EDU-CONFIRM',
        submittedAt: '2026-09-03T10:00:00Z'
      };
      const html = renderApplicationWorkflow(store);
      assert.ok(html.includes('Application Submitted Successfully!'));
      assert.ok(html.includes('APP-2026-EDU-CONFIRM'));
      assert.ok(html.includes('● SUBMITTED'));
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
