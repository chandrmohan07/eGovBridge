import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderGrievanceFeedback } from '../public/js/components/GrievanceFeedback.js';

describe('Phase 19 — Feedback & Grievance System Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  let createdGrievanceId = '';
  let vaultDocId = '';

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

  it('Start dev server with Grievance & Feedback Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, Officers, and Admin', async () => {
    // 1. Citizen 1 Login (Rahul Verma)
    const c1 = await request('POST', '/api/v1/auth/login', {
      email: 'citizen@example.com',
      password: 'Citizen@123'
    });
    assert.equal(c1.statusCode, 200);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Pooja Patil',
      email: `grv_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 99992',
      state: 'Maharashtra',
      district: 'Nagpur'
    });
    assert.equal(c2.statusCode, 201);
    citizen2Token = c2.data.token;

    // 3. Education Officer Login
    const edu = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(edu.statusCode, 200);
    eduOfficerToken = edu.data.token;

    // 4. Revenue Officer Login
    const rev = await request('POST', '/api/v1/auth/login', {
      email: 'officer.rev@gov.in',
      password: 'Officer@123'
    });
    assert.equal(rev.statusCode, 200);
    revOfficerToken = rev.data.token;

    // 5. Admin Login
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;
  });

  // ==========================================
  // 1. CATEGORIES API
  // ==========================================
  it('GET /api/v1/grievances/categories returns configured grievance categories', async () => {
    const res = await request('GET', '/api/v1/grievances/categories');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.categories));
    assert.ok(res.data.categories.length >= 5);
    assert.ok(res.data.categories.some(c => c.id === 'SERVICE_DELAY'));
  });

  // ==========================================
  // 2. CITIZEN GRIEVANCE REGISTRATION & VALIDATION
  // ==========================================
  it('Rejection when department is missing (HTTP 400)', async () => {
    const res = await request('POST', '/api/v1/grievances', {
      subject: 'Scholarship payment delay',
      description: 'The scholarship payment has not arrived yet.'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
  });

  it('Rejection when department does not exist (HTTP 404)', async () => {
    const res = await request('POST', '/api/v1/grievances', {
      departmentId: 'DEP-NONEXISTENT',
      subject: 'Scholarship payment delay',
      description: 'The scholarship payment has not arrived yet.'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 404);
  });

  it('Rejection when subject or description are too short (HTTP 400)', async () => {
    const res = await request('POST', '/api/v1/grievances', {
      departmentId: 'DEP-EDU',
      subject: 'Bad',
      description: 'Short'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 400);
  });

  it('Setup: Citizen 1 uploads supporting document to Digital Document Vault (Phase 13)', async () => {
    const uploadRes = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Fee Receipt',
      fileName: 'Fee_Receipt_2026.pdf',
      fileData: Buffer.from('Sample Academic Fee Payment Receipt').toString('base64'),
      mimeType: 'application/pdf',
      tags: ['Scholarship', 'Proof']
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(uploadRes.statusCode, 201);
    vaultDocId = uploadRes.data.document.id;
  });

  it('Citizen 1 successfully submits a grievance with linked Application & Vault document', async () => {
    const res = await request('POST', '/api/v1/grievances', {
      departmentId: 'DEP-EDU',
      category: 'Service Delay',
      subject: 'Severe delay in Post-Matric Scholarship Verification',
      description: 'My application has remained in pending review for 20 days. Please expedite the verification.',
      priority: 'HIGH',
      applicationId: 'APP-2026-EDU-8812',
      supportingDocumentIds: [vaultDocId]
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.ok(res.data.grievance.id.startsWith('GRV-2026-'));
    assert.equal(res.data.grievance.status, 'SUBMITTED');
    assert.equal(res.data.grievance.priority, 'HIGH');
    assert.equal(res.data.grievance.supportingDocuments.length, 1);
    assert.equal(res.data.grievance.supportingDocuments[0].id, vaultDocId);
    assert.equal(res.data.grievance.timeline[0].event, 'SUBMITTED');

    createdGrievanceId = res.data.grievance.id;
  });

  // ==========================================
  // 3. ROLE-BASED ACCESS CONTROL & PRIVACY
  // ==========================================
  it('Citizen 2 CANNOT access Citizen 1 grievance (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/grievances/${createdGrievanceId}`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  it('Citizen 1 retrieves own grievance — internalNotes are strictly stripped/shielded', async () => {
    const res = await request('GET', `/api/v1/grievances/${createdGrievanceId}`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.grievance.id, createdGrievanceId);
    assert.equal(res.data.grievance.internalNotes, undefined); // Shielded from citizen!
  });

  it('Revenue Officer CANNOT access Education grievance (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/grievances/${createdGrievanceId}`, null, {
      'Authorization': `Bearer ${revOfficerToken}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  it('Education Officer CAN access Education grievance (HTTP 200)', async () => {
    const res = await request('GET', `/api/v1/grievances/${createdGrievanceId}`, null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.grievance.internalNotes)); // Accessible to officer
  });

  // ==========================================
  // 4. DEPARTMENT OFFICER WORKFLOW & CLARIFICATION CYCLE
  // ==========================================
  it('Education Officer claims grievance (SUBMITTED -> UNDER_REVIEW)', async () => {
    const res = await request('POST', `/api/v1/grievances/${createdGrievanceId}/claim`, null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.grievance.status, 'UNDER_REVIEW');
    assert.ok(res.data.grievance.assignedOfficerId);
    assert.ok(res.data.grievance.timeline.some(t => t.event === 'ASSIGNED'));
  });

  it('Education Officer adds an internal investigation note', async () => {
    const res = await request('POST', `/api/v1/grievances/${createdGrievanceId}/notes`, {
      note: 'Contacted State Scholarship Board officer. Awaiting admission roster confirmation.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.ok(res.data.note.noteId);
  });

  it('Citizen STILL cannot see the newly added internal note', async () => {
    const res = await request('GET', `/api/v1/grievances/${createdGrievanceId}`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.grievance.internalNotes, undefined);
  });

  it('Education Officer requests clarification (UNDER_REVIEW -> CLARIFICATION_REQUIRED)', async () => {
    const res = await request('POST', `/api/v1/grievances/${createdGrievanceId}/clarification`, {
      question: 'Please provide your official university bonafide certificate to proceed.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.grievance.status, 'CLARIFICATION_REQUIRED');
    assert.ok(res.data.grievance.timeline.some(t => t.event === 'CLARIFICATION_REQUESTED'));
  });

  it('Citizen 1 responds to clarification (CLARIFICATION_REQUIRED -> IN_PROGRESS)', async () => {
    const res = await request('POST', `/api/v1/grievances/${createdGrievanceId}/respond`, {
      response: 'I have attached my official bonafide certificate as requested by the officer.'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.grievance.status, 'IN_PROGRESS');
    assert.ok(res.data.grievance.timeline.some(t => t.event === 'CLARIFICATION_SUBMITTED'));
  });

  it('Education Officer resolves grievance (IN_PROGRESS -> RESOLVED)', async () => {
    // Missing reason rejection
    const failRes = await request('POST', `/api/v1/grievances/${createdGrievanceId}/resolve`, {
      resolutionReason: 'Too short'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(failRes.statusCode, 400);

    // Valid resolution
    const res = await request('POST', `/api/v1/grievances/${createdGrievanceId}/resolve`, {
      resolutionReason: 'Verification verified against university roster. Scholarship sanction letter dispatched.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.grievance.status, 'RESOLVED');
    assert.ok(res.data.grievance.resolvedAt);
    assert.ok(res.data.grievance.resolutionReason.includes('university roster'));
  });

  it('Citizen 1 closes resolved grievance (RESOLVED -> CLOSED)', async () => {
    const res = await request('POST', `/api/v1/grievances/${createdGrievanceId}/close`, {
      closingRemarks: 'Received the scholarship disbursement. Issue completely resolved.'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.grievance.status, 'CLOSED');
    assert.ok(res.data.grievance.closedAt);
  });

  it('GET /api/v1/grievances/:id/timeline returns complete chronological activity history', async () => {
    const res = await request('GET', `/api/v1/grievances/${createdGrievanceId}/timeline`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.timeline));
    assert.ok(res.data.timeline.length >= 5); // SUBMITTED, ASSIGNED, CLARIFICATION_REQUESTED, CLARIFICATION_SUBMITTED, RESOLVED, CLOSED
  });

  // ==========================================
  // 5. REVENUE OFFICER REJECTION SCENARIO
  // ==========================================
  it('Scenario 2: Revenue grievance rejection with statutory grounds', async () => {
    // Citizen 2 registers Revenue grievance
    const grvRes = await request('POST', '/api/v1/grievances', {
      departmentId: 'DEP-REV',
      category: 'Document Issue',
      subject: 'Land mutation record not updating automatically',
      description: 'The revenue adapter has not synchronized my registered deed for parcel 401.'
    }, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(grvRes.statusCode, 201);
    const revGrievanceId = grvRes.data.grievance.id;

    // Revenue Officer claims
    await request('POST', `/api/v1/grievances/${revGrievanceId}/claim`, null, {
      'Authorization': `Bearer ${revOfficerToken}`
    });

    // Revenue Officer rejects
    const rejRes = await request('POST', `/api/v1/grievances/${revGrievanceId}/reject`, {
      rejectionReason: 'Parcel 401 is subject to an active civil court injunction order. Mutation stayed under Section 52.'
    }, {
      'Authorization': `Bearer ${revOfficerToken}`
    });
    assert.equal(rejRes.statusCode, 200);
    assert.equal(rejRes.data.grievance.status, 'REJECTED');
    assert.ok(rejRes.data.grievance.rejectionReason.includes('injunction order'));
  });

  // ==========================================
  // 6. CITIZEN FEEDBACK SYSTEM
  // ==========================================
  it('Citizen submits service feedback (POST /api/v1/feedback)', async () => {
    // Rejection on invalid rating
    const failRes = await request('POST', '/api/v1/feedback', {
      serviceId: 'SRV-EDU-001',
      rating: 6,
      feedbackText: 'Rating exceeds bounds'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(failRes.statusCode, 400);

    // Valid feedback
    const res = await request('POST', '/api/v1/feedback', {
      serviceId: 'SRV-EDU-001',
      rating: 4,
      category: 'Service Experience',
      feedbackText: 'The scholarship grievance resolution was fast and transparent once bonafide was verified.'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.feedback.rating, 4);
  });

  it('GET /api/v1/feedback retrieves citizen feedback records', async () => {
    const res = await request('GET', '/api/v1/feedback', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.feedback.length >= 1);
  });

  // ==========================================
  // 7. ADMIN GRIEVANCE ANALYTICS
  // ==========================================
  it('Citizen CANNOT access admin grievance analytics (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/grievances/analytics', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Admin retrieves aggregated grievance & feedback analytics', async () => {
    const res = await request('GET', '/api/v1/grievances/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.analytics.totalGrievances >= 2);
    assert.ok(res.data.analytics.byStatus);
    assert.ok(res.data.analytics.byDepartment);
    assert.ok(res.data.analytics.feedbackSummary);
  });

  // ==========================================
  // 8. UI COMPONENT RENDERING
  // ==========================================
  it('renderGrievanceFeedback renders portal header, metrics, and grievance table properly', () => {
    const mockStore = {
      grievances: [
        {
          id: 'GRV-2026-EDU-001',
          ticketId: 'GRV-2026-EDU-001',
          departmentCode: 'EDUCATION',
          category: 'Service Delay',
          subject: 'Delay in Higher Education Scholarship Verification',
          priority: 'HIGH',
          status: 'RESOLVED',
          createdAt: '2026-09-01T09:30:00Z'
        }
      ]
    };

    const html = renderGrievanceFeedback(mockStore);
    assert.ok(html.includes('Feedback & Grievance Redressal Portal'));
    assert.ok(html.includes('Register New Grievance'));
    assert.ok(html.includes('GRV-2026-EDU-001'));
    assert.ok(html.includes('RESOLVED'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
