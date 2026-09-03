import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderOfficerWorkflow } from '../public/js/components/OfficerWorkflow.js';
import { db } from '../server/db.js';

describe('Phase 11 — Department Officer Workflow Verification', () => {
  let server;
  let port;

  let citizenToken = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  let testEduAppId = '';
  let testRevAppId = '';

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

  it('Start dev server with Department Officer Workflow', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen, Officers (Education & Revenue), and Seed Applications', async () => {
    // 1. Citizen Registration
    const citReg = await request('POST', '/api/v1/auth/register', {
      name: 'Pooja Verma',
      email: `cit_workflow_${Date.now()}@example.com`,
      password: 'Password@123',
      phone: '+91 98765 44444',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(citReg.statusCode, 201);
    citizenToken = citReg.data.token;

    // 2. Education Officer Login
    const eduLogin = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(eduLogin.statusCode, 200);
    eduOfficerToken = eduLogin.data.token;

    // 3. Revenue Officer Login
    const revLogin = await request('POST', '/api/v1/auth/login', {
      email: 'officer.rev@gov.in',
      password: 'Officer@123'
    });
    assert.equal(revLogin.statusCode, 200);
    revOfficerToken = revLogin.data.token;

    // 4. Admin Login
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adminLogin.statusCode, 200);
    adminToken = adminLogin.data.token;

    // 5. Citizen creates an Education Department Application
    const appEduRes = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-EDU-001',
      formData: {
        fullName: 'Pooja Verma',
        email: 'pooja.verma@example.com',
        phone: '+91 98765 44444',
        address: 'Plot 45, Model Colony, Pune',
        district: 'Pune',
        state: 'Maharashtra',
        annualIncome: '180000',
        institution: 'Pune University',
        course: 'B.Tech IT',
        previousMarks: '92.5'
      },
      documents: [
        { name: 'Income Certificate', fileName: 'income.pdf', fileSize: 1024, status: 'Uploaded' },
        { name: '12th Marksheet', fileName: 'marksheet.pdf', fileSize: 1024, status: 'Uploaded' }
      ],
      status: 'SUBMITTED'
    }, { 'Authorization': `Bearer ${citizenToken}` });
    assert.equal(appEduRes.statusCode, 201);
    testEduAppId = appEduRes.data.application.id;

    // 6. Citizen creates a Revenue Department Application
    const appRevRes = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-REV-002',
      formData: {
        fullName: 'Pooja Verma',
        email: 'pooja.verma@example.com',
        phone: '+91 98765 44444',
        address: 'Plot 45, Model Colony, Pune',
        district: 'Pune',
        state: 'Maharashtra',
        annualIncome: '180000',
        occupation: 'Self-Employed',
        purpose: 'Income Verification for Quota'
      },
      documents: [
        { name: 'Salary Slip', fileName: 'salary.pdf', fileSize: 1024, status: 'Uploaded' },
        { name: 'Ration Card', fileName: 'ration.pdf', fileSize: 1024, status: 'Uploaded' }
      ],
      status: 'SUBMITTED'
    }, { 'Authorization': `Bearer ${citizenToken}` });
    assert.equal(appRevRes.statusCode, 201);
    testRevAppId = appRevRes.data.application.id;
  });

  // 1. RBAC & Security Boundaries
  it('Citizen CANNOT access officer application queue (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/officer/applications', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Citizen CANNOT call officer claim endpoint (HTTP 403 Forbidden)', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/claim`, {}, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Education Officer sees only EDUCATION applications in queue', async () => {
    const res = await request('GET', '/api/v1/officer/applications', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.departmentCode, 'EDUCATION');
    assert.ok(res.data.applications.every(a => a.departmentCode === 'EDUCATION'));
    assert.ok(res.data.applications.some(a => a.id === testEduAppId));
  });

  it('Revenue Officer CANNOT access Education application detail (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/officer/applications/${testEduAppId}`, null, {
      'Authorization': `Bearer ${revOfficerToken}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('cannot view applications belonging to'));
  });

  it('Education Officer can access Education application detail (HTTP 200)', async () => {
    const res = await request('GET', `/api/v1/officer/applications/${testEduAppId}`, null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.application.id, testEduAppId);
    assert.ok(res.data.application.timeline);
  });

  // 2. Claim, Review, Notes & Clarifications
  it('Education Officer claims the application for review', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/claim`, {
      expectedVersion: 1
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.application.status, 'UNDER_REVIEW');
    assert.equal(res.data.application.assignedOfficerName, 'Dr. Sunita Sharma');
    assert.ok(res.data.application.version > 1);
  });

  it('Optimistic concurrency: rejects claim with outdated expectedVersion (HTTP 409)', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/claim`, {
      expectedVersion: 1 // Outdated version since claim bumped version to 2
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 409);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('modified'));
  });

  it('Officer records internal processing notes (Officer Only)', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/notes`, {
      note: 'Income certificate verified against state tahsildar portal. High academic percentile confirmed.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.ok(res.data.note.noteId.startsWith('NOTE-'));
    assert.equal(res.data.note.officerName, 'Dr. Sunita Sharma');
  });

  it('Internal notes are NEVER exposed to the citizen in GET /api/v1/applications/:id', async () => {
    const res = await request('GET', `/api/v1/applications/${testEduAppId}`, null, {
      'Authorization': `Bearer ${citizenToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.application.id, testEduAppId);
    assert.equal(res.data.application.internalNotes, undefined);
  });

  it('Officer requests clarification from the citizen', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/clarification`, {
      requestedInfo: 'Please submit latest semester fee receipt from Pune Engineering College.',
      reason: 'Fee receipt missing from initial admission documentation bundle.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.application.status, 'CLARIFICATION_REQUIRED');
    assert.ok(res.data.clarification.clarificationId.startsWith('CLR-'));
    assert.equal(res.data.clarification.status, 'PENDING');
  });

  it('Citizen sees updated status "CLARIFICATION_REQUIRED" in their application tracking', async () => {
    const res = await request('GET', `/api/v1/applications/${testEduAppId}`, null, {
      'Authorization': `Bearer ${citizenToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.application.status, 'CLARIFICATION_REQUIRED');
    assert.ok(res.data.application.currentStage.includes('Clarification'));
  });

  // 3. Approval Flow & Orchestration Synchronization
  it('Officer approves the application and records decision remarks', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/approve`, {
      remarks: 'All documents verified and family income qualifies for Tier-1 merit scholarship.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.application.status, 'APPROVED');
    assert.equal(res.data.application.decision.verdict, 'APPROVED');
    assert.ok(res.data.application.timeline.some(t => t.event === 'APPROVED'));

    // Verify linked Phase 6 Orchestration task status
    const appRecord = db.getApplicationById(testEduAppId);
    assert.ok(appRecord.orchestrationId);
    const orch = db.getOrchestrationById(appRecord.orchestrationId);
    assert.ok(orch);
    const eduTask = orch.tasks.find(t => t.departmentCode === 'EDUCATION' || t.department === 'EDUCATION');
    if (eduTask) {
      assert.equal(eduTask.status, 'COMPLETED');
    }
  });

  it('Officer completes the approved application', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/complete`, {
      certificateUrl: 'https://cert.gov.in/edu/2026/pooja_scholarship.pdf',
      remarks: 'Direct benefit transfer disbursement tranche scheduled.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.application.status, 'COMPLETED');
    assert.ok(res.data.application.completedAt);
  });

  it('Completed application cannot be modified or re-decided (HTTP 400)', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testEduAppId}/reject`, {
      reason: 'Attempting to reject an already completed record'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('already been decided'));
  });

  // 4. Rejection Flow
  it('Rejection fails if mandatory documented reason is missing or too short', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testRevAppId}/reject`, {
      reason: 'bad' // Too short (< 5 chars)
    }, {
      'Authorization': `Bearer ${revOfficerToken}`
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('Mandatory rejection reason'));
  });

  it('Revenue Officer rejects the Revenue application with a valid reason', async () => {
    const res = await request('POST', `/api/v1/officer/applications/${testRevAppId}/reject`, {
      reason: 'Reported land parcel khasra KH-102 belongs to joint dispute currently pending civil court decree.',
      remarks: 'Applicant may resubmit after resolving demarcation decree.'
    }, {
      'Authorization': `Bearer ${revOfficerToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.application.status, 'REJECTED');
    assert.equal(res.data.application.decision.verdict, 'REJECTED');
    assert.ok(res.data.application.timeline.some(t => t.event === 'REJECTED'));
  });

  it('Citizen sees updated "REJECTED" status in their application view', async () => {
    const res = await request('GET', `/api/v1/applications/${testRevAppId}`, null, {
      'Authorization': `Bearer ${citizenToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.application.status, 'REJECTED');
    assert.ok(res.data.application.currentStage.includes('Rejected'));
  });

  // 5. Departmental Workload Analytics Endpoint
  it('GET /api/v1/officer/workload returns accurate statistics for the department', async () => {
    const res = await request('GET', '/api/v1/officer/workload', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.departmentCode, 'EDUCATION');
    assert.ok(typeof res.data.stats.total === 'number');
    assert.ok(typeof res.data.stats.completed === 'number');
  });

  // 6. UI Component Rendering
  it('renderOfficerWorkflow generates complete dashboard with workload metrics and queue table', () => {
    const mockStore = {
      user: {
        name: 'Ananya Sharma',
        role: 'OFFICER',
        departmentCode: 'EDUCATION',
        designation: 'Senior Scrutiny Officer'
      },
      officerWorkload: {
        total: 5,
        pending: 2,
        underReview: 1,
        clarificationRequired: 1,
        approved: 0,
        rejected: 0,
        completed: 1
      },
      officerQueue: [
        {
          id: 'APP-2026-EDU-8812',
          serviceName: 'Post-Matric Scholarship',
          applicantName: 'Rahul Verma',
          submittedDate: '2026-08-28',
          status: 'UNDER_REVIEW',
          assignedOfficerName: 'Dr. Sunita Sharma'
        }
      ],
      activeOfficerApplication: null
    };

    const html = renderOfficerWorkflow(mockStore);
    assert.ok(html.includes('OFFICER CONSOLE'));
    assert.ok(html.includes('EDUCATION DEPARTMENT'));
    assert.ok(html.includes('Ananya Sharma'));
    assert.ok(html.includes('Departmental Verification Queue'));
    assert.ok(html.includes('APP-2026-EDU-8812'));
    assert.ok(html.includes('Inspect & Process'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
