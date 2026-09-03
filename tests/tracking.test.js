import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderApplicationTracking } from '../public/js/components/ApplicationTracking.js';
import { db } from '../server/db.js';

describe('Phase 12 — Application Tracking Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  let cit1AppId = '';
  let cit2AppId = '';

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

  it('Start dev server with Application Tracking Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, Officers, and Seed Applications', async () => {
    // 1. Citizen 1 Registration
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Rohan Deshmukh',
      email: `tracking_c1_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 12345',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Priya Pillai',
      email: `tracking_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 67890',
      state: 'Kerala',
      district: 'Kochi'
    });
    assert.equal(c2.statusCode, 201);
    citizen2Token = c2.data.token;

    // 3. Education Officer Login
    const offEdu = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(offEdu.statusCode, 200);
    eduOfficerToken = offEdu.data.token;

    // 4. Revenue Officer Login
    const offRev = await request('POST', '/api/v1/auth/login', {
      email: 'officer.rev@gov.in',
      password: 'Officer@123'
    });
    assert.equal(offRev.statusCode, 200);
    revOfficerToken = offRev.data.token;

    // 5. Admin Login
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;

    // 6. Citizen 1 submits an Education Application
    const app1 = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-EDU-001',
      formData: {
        fullName: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@test.com',
        phone: '+91 98765 12345',
        address: 'Flat 301, Shivam Apts, Pune',
        district: 'Pune',
        state: 'Maharashtra',
        annualIncome: '180000',
        institution: 'COEP Technological University',
        course: 'Computer Engineering',
        previousMarks: '94.2'
      },
      documents: [
        { name: 'Income Certificate', fileName: 'income.pdf', fileSize: 1024, status: 'Uploaded' },
        { name: '12th Marksheet', fileName: 'marksheet.pdf', fileSize: 1024, status: 'Uploaded' }
      ],
      status: 'SUBMITTED'
    }, { 'Authorization': `Bearer ${citizen1Token}` });
    assert.equal(app1.statusCode, 201);
    cit1AppId = app1.data.application.id;

    // 7. Citizen 2 submits a Revenue Application
    const app2 = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-REV-002',
      formData: {
        fullName: 'Priya Pillai',
        email: 'priya.pillai@test.com',
        phone: '+91 98765 67890',
        address: 'House 14, Marine Drive, Kochi',
        district: 'Ernakulam',
        state: 'Kerala',
        annualIncome: '220000',
        occupation: 'Graphic Designer',
        purpose: 'EWS Quota Certificate'
      },
      documents: [
        { name: 'Salary Slip', fileName: 'salary.pdf', fileSize: 1024, status: 'Uploaded' },
        { name: 'Ration Card', fileName: 'ration.pdf', fileSize: 1024, status: 'Uploaded' }
      ],
      status: 'SUBMITTED'
    }, { 'Authorization': `Bearer ${citizen2Token}` });
    assert.equal(app2.statusCode, 201);
    cit2AppId = app2.data.application.id;
  });

  // 1. Authentication & Security Isolation
  it('Unauthenticated tracking request returns HTTP 401 Unauthorized', async () => {
    const res = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`);
    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
  });

  it('Citizen 2 CANNOT access Citizen 1 application tracking (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
    assert.ok(res.data.error.includes('do not have permission'));
  });

  it('Manipulated or non-existent application ID returns HTTP 404 Not Found', async () => {
    const res = await request('GET', '/api/v1/applications/APP-NON-EXISTENT-9999/tracking', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.data.success, false);
  });

  // 2. Citizen "My Applications" List & Filtering
  it('Citizen 1 can list their own submitted applications (GET /api/v1/applications)', async () => {
    const res = await request('GET', '/api/v1/applications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.applications));
    assert.equal(res.data.count, 1);
    assert.equal(res.data.applications[0].id, cit1AppId);
    assert.equal(res.data.applications[0].status, 'SUBMITTED');
  });

  it('Citizen 1 can filter applications by status and search keyword', async () => {
    const resMatch = await request('GET', '/api/v1/applications?status=SUBMITTED&search=Scholarship', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resMatch.statusCode, 200);
    assert.equal(resMatch.data.count, 1);

    const resNoMatch = await request('GET', '/api/v1/applications?status=APPROVED', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resNoMatch.statusCode, 200);
    assert.equal(resNoMatch.data.count, 0);
  });

  // 3. Detailed Application Tracking View
  it('Citizen 1 retrieves real-time tracking details for their application', async () => {
    const res = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    const tracking = res.data.tracking;
    assert.equal(tracking.applicationId, cit1AppId);
    assert.equal(tracking.departmentCode, 'EDUCATION');
    assert.equal(tracking.status, 'SUBMITTED');
    assert.ok(tracking.progressPercentage >= 25);
    assert.ok(Array.isArray(tracking.timeline));
    assert.ok(tracking.timeline.some(t => t.event === 'SUBMITTED'));
    assert.ok(Array.isArray(tracking.orchestrationMilestones));
  });

  // 4. Officer Claim & Review Reflection in Citizen Tracking
  it('Officer claims application and citizen tracking reflects "UNDER_REVIEW"', async () => {
    // Education Officer claims application
    const claimRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/claim`, {
      expectedVersion: 1
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(claimRes.statusCode, 200);

    // Citizen tracks application again
    const trackRes = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(trackRes.statusCode, 200);
    assert.equal(trackRes.data.tracking.status, 'UNDER_REVIEW');
    assert.ok(trackRes.data.tracking.timeline.some(t => t.event === 'CLAIMED'));
  });

  // 5. Internal Notes Privacy Protection
  it('Officer internal notes are strictly shielded and NEVER leaked to citizen tracking', async () => {
    // Officer adds an internal processing note
    const noteRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/notes`, {
      note: 'Confidential verification: Applicant income bracket cross-checked against tax database.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(noteRes.statusCode, 201);

    // Citizen calls GET /api/v1/applications/:id
    const appRes = await request('GET', `/api/v1/applications/${cit1AppId}`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(appRes.statusCode, 200);
    assert.equal(appRes.data.application.internalNotes, undefined);

    // Citizen calls GET /api/v1/applications/:id/tracking
    const trackRes = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(trackRes.statusCode, 200);
    assert.equal(trackRes.data.tracking.internalNotes, undefined);
  });

  // 6. Clarification Workflow: Request, Tracking Reflection, and Citizen Response
  it('Officer requests clarification and citizen sees "CLARIFICATION_REQUIRED"', async () => {
    const clarReq = await request('POST', `/api/v1/officer/applications/${cit1AppId}/clarification`, {
      requestedInfo: 'Please submit domicile certificate for Maharashtra state quota.',
      reason: 'Domicile proof was not present in the initial marksheet attachment bundle.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(clarReq.statusCode, 200);

    // Citizen tracks application
    const trackRes = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(trackRes.statusCode, 200);
    assert.equal(trackRes.data.tracking.status, 'CLARIFICATION_REQUIRED');
    assert.equal(trackRes.data.tracking.pendingClarifications.length, 1);
    assert.ok(trackRes.data.tracking.pendingClarifications[0].requestedInfo.includes('domicile certificate'));
  });

  it('Citizen submits clarification response, returning status to "UNDER_REVIEW"', async () => {
    // Get pending clarification ID
    const trackRes1 = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    const clarId = trackRes1.data.tracking.pendingClarifications[0].clarificationId;

    // Citizen responds
    const respondRes = await request('POST', `/api/v1/applications/${cit1AppId}/clarification/respond`, {
      clarificationId: clarId,
      responseMessage: 'Uploaded domicile certificate issued by Tahsildar Haveli, Pune.',
      documents: [
        { name: 'Domicile Certificate', fileName: 'domicile_cert.pdf', fileSize: 2048, status: 'Uploaded' }
      ]
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(respondRes.statusCode, 200);
    assert.equal(respondRes.data.success, true);

    // Citizen tracks application again
    const trackRes2 = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(trackRes2.statusCode, 200);
    assert.equal(trackRes2.data.tracking.status, 'UNDER_REVIEW');
    assert.equal(trackRes2.data.tracking.pendingClarifications.length, 0);
    assert.equal(trackRes2.data.tracking.resolvedClarifications.length, 1);
    assert.ok(trackRes2.data.tracking.timeline.some(t => t.event === 'CLARIFICATION_SUBMITTED'));
  });

  // 7. Approval & Completion Tracking
  it('Officer approves application and citizen sees "APPROVED" with remarks', async () => {
    const approveRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/approve`, {
      remarks: 'Domicile and academic credentials successfully verified. Merit scholarship sanctioned.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(approveRes.statusCode, 200);

    const trackRes = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(trackRes.statusCode, 200);
    assert.equal(trackRes.data.tracking.status, 'APPROVED');
    assert.equal(trackRes.data.tracking.decision.verdict, 'APPROVED');
    assert.ok(trackRes.data.tracking.decision.remarks.includes('sanctioned'));
  });

  it('Officer completes application and citizen sees "COMPLETED" with certificate link', async () => {
    const completeRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/complete`, {
      certificateUrl: 'https://digilocker.gov.in/certs/2026/edu/scholarship_sanction_rohan.pdf',
      remarks: 'Digital Sanction Order generated and dispatched.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(completeRes.statusCode, 200);

    const trackRes = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(trackRes.statusCode, 200);
    assert.equal(trackRes.data.tracking.status, 'COMPLETED');
    assert.equal(trackRes.data.tracking.progressPercentage, 100);
    assert.equal(trackRes.data.tracking.certificateUrl, 'https://digilocker.gov.in/certs/2026/edu/scholarship_sanction_rohan.pdf');
  });

  // 8. Rejection Tracking
  it('Officer rejects Revenue application and citizen sees "REJECTED" with reason', async () => {
    const rejRes = await request('POST', `/api/v1/officer/applications/${cit2AppId}/reject`, {
      reason: 'Reported family annual income exceeds statutory cap for EWS reservation quota.',
      remarks: 'Applicant may review income limit guidelines before submitting appeals.'
    }, {
      'Authorization': `Bearer ${revOfficerToken}`
    });
    assert.equal(rejRes.statusCode, 200);

    const trackRes = await request('GET', `/api/v1/applications/${cit2AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(trackRes.statusCode, 200);
    assert.equal(trackRes.data.tracking.status, 'REJECTED');
    assert.equal(trackRes.data.tracking.decision.verdict, 'REJECTED');
    assert.ok(trackRes.data.tracking.decision.reason.includes('exceeds statutory cap'));
  });

  // 9. UI Component Rendering
  it('renderApplicationTracking renders My Applications list and detailed timeline stepper', () => {
    const mockStore = {
      citizenApplications: [
        {
          id: 'APP-2026-EDU-9901',
          serviceName: 'Post-Matric Scholarship',
          departmentCode: 'EDUCATION',
          status: 'COMPLETED',
          submittedDate: '2026-08-28'
        }
      ],
      activeTrackingApplication: {
        applicationId: 'APP-2026-EDU-9901',
        serviceName: 'Post-Matric Scholarship',
        departmentCode: 'EDUCATION',
        status: 'COMPLETED',
        progressPercentage: 100,
        submittedDate: '2026-08-28',
        currentStage: 'Service Fulfilled',
        decision: {
          verdict: 'APPROVED',
          remarks: 'Criteria met'
        },
        certificateUrl: 'https://digilocker.gov.in/sample.pdf',
        timeline: [
          { event: 'COMPLETED', description: 'Application fulfilled', timestamp: new Date().toISOString() },
          { event: 'SUBMITTED', description: 'Application submitted', timestamp: new Date().toISOString() }
        ],
        orchestrationMilestones: [
          { title: 'Identity Verification', department: 'DigiLocker', completed: true, status: 'COMPLETED' }
        ]
      }
    };

    const html = renderApplicationTracking(mockStore);
    assert.ok(html.includes('Citizen Application Tracking'));
    assert.ok(html.includes('APP-2026-EDU-9901'));
    assert.ok(html.includes('Post-Matric Scholarship'));
    assert.ok(html.includes('COMPLETED'));
    assert.ok(html.includes('Download Certificate'));
    assert.ok(html.includes('Application Lifecycle Audit Timeline'));
    assert.ok(html.includes('Identity Verification'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
