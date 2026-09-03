import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderNotifications } from '../public/js/components/Notifications.js';
import { db } from '../server/db.js';

describe('Phase 14 — Notification System Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  let cit1AppId = '';
  let cit1NotifId = '';
  let clarificationId = '';

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

  it('Start dev server with Notification System Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, and Department Officers', async () => {
    // 1. Citizen 1 Registration
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Rohan Deshpande',
      email: `notif_c1_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 11111',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Kavita Rao',
      email: `notif_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 22222',
      state: 'Karnataka',
      district: 'Bengaluru'
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
  });

  // 1. Configured Notification Types
  it('GET /api/v1/notifications/types returns centralized notification categories', async () => {
    const res = await request('GET', '/api/v1/notifications/types');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.notificationTypes));
    assert.ok(res.data.notificationTypes.some(t => t.code === 'APPLICATION_SUBMITTED'));
    assert.ok(res.data.notificationTypes.some(t => t.code === 'APPLICATION_APPROVED'));
    assert.ok(res.data.notificationTypes.some(t => t.code === 'CLARIFICATION_REQUIRED'));
  });

  // 2. Authentication Guards
  it('Unauthenticated requests to notifications endpoints return HTTP 401', async () => {
    const resList = await request('GET', '/api/v1/notifications');
    assert.equal(resList.statusCode, 401);

    const resUnread = await request('GET', '/api/v1/notifications/unread-count');
    assert.equal(resUnread.statusCode, 401);
  });

  // 3. Event Trigger: Citizen Submits Application
  it('Application Submission triggers notifications for Citizen and Department Officer', async () => {
    const appRes = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-EDU-001',
      formData: {
        fullName: 'Rohan Deshpande',
        email: 'rohan.deshpande@test.com',
        phone: '+91 98765 11111',
        address: '44 Senapati Bapat Road, Pune',
        district: 'Pune',
        state: 'Maharashtra',
        annualIncome: '180000',
        institution: 'Savitribai Phule Pune University',
        course: 'B.Tech IT',
        previousMarks: '85.6'
      },
      documents: [
        { name: 'College Admission Letter', fileName: 'admission_letter.pdf', fileSize: 1024, status: 'Uploaded' }
      ],
      status: 'SUBMITTED'
    }, { 'Authorization': `Bearer ${citizen1Token}` });

    assert.equal(appRes.statusCode, 201);
    cit1AppId = appRes.data.application.id;

    // Verify Citizen 1 received APPLICATION_SUBMITTED notification
    const citNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(citNotifs.statusCode, 200);
    assert.ok(citNotifs.data.notifications.length >= 1);
    const subNotif = citNotifs.data.notifications.find(n => n.type === 'APPLICATION_SUBMITTED' && n.applicationId === cit1AppId);
    assert.ok(subNotif, 'Citizen must receive APPLICATION_SUBMITTED notification');
    assert.equal(subNotif.status, 'UNREAD');
    assert.ok(subNotif.title.includes('Application Submitted'));
    cit1NotifId = subNotif.id;

    // Verify Education Officer received OFFICER_TASK_ASSIGNED notification
    const offNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(offNotifs.statusCode, 200);
    assert.ok(offNotifs.data.notifications.some(n => n.type === 'OFFICER_TASK_ASSIGNED' && n.applicationId === cit1AppId));
  });

  // 4. Unread Count & Mark as Read
  it('GET /api/v1/notifications/unread-count returns accurate unread count', async () => {
    const res = await request('GET', '/api/v1/notifications/unread-count', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.unreadCount >= 1);
  });

  it('POST /api/v1/notifications/:id/read marks single notification as read', async () => {
    const res = await request('POST', `/api/v1/notifications/${cit1NotifId}/read`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.notification.status, 'READ');
    assert.ok(res.data.notification.readAt !== null);
  });

  // 5. Cross-User Security Check
  it('Citizen 2 CANNOT mark Citizen 1 notification as read (HTTP 403 Forbidden)', async () => {
    const res = await request('POST', `/api/v1/notifications/${cit1NotifId}/read`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  // 6. Event Trigger: Officer Claims Application
  it('Officer claims application -> Citizen receives APPLICATION_ASSIGNED notification', async () => {
    const claimRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/claim`, null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(claimRes.statusCode, 200);

    const citNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(citNotifs.data.notifications.some(n => n.type === 'APPLICATION_ASSIGNED' && n.applicationId === cit1AppId));
  });

  // 7. Event Trigger: Clarification Requested & Citizen Response
  it('Officer requests clarification -> Citizen receives CLARIFICATION_REQUIRED notification', async () => {
    const clarRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/clarification`, {
      requestedInfo: 'Please provide certified income slip from local Tehsildar',
      reason: 'Discrepancy with state income registry'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(clarRes.statusCode, 200);
    clarificationId = clarRes.data.clarification.clarificationId;

    const citNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    const clarNotif = citNotifs.data.notifications.find(n => n.type === 'CLARIFICATION_REQUIRED' && n.applicationId === cit1AppId);
    assert.ok(clarNotif);
    assert.equal(clarNotif.priority, 'URGENT');
  });

  it('Citizen submits clarification -> Officer receives CLARIFICATION_SUBMITTED notification', async () => {
    const respRes = await request('POST', `/api/v1/applications/${cit1AppId}/clarification/respond`, {
      clarificationId,
      responseMessage: 'Uploaded signed income certificate from Tehsildar Haveli',
      documents: [{ name: 'Certified Income Proof', fileName: 'tehsildar_income.pdf', fileSize: 1024, status: 'Uploaded' }]
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(respRes.statusCode, 200);

    const offNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.ok(offNotifs.data.notifications.some(n => n.type === 'CLARIFICATION_SUBMITTED' && n.applicationId === cit1AppId));
  });

  // 8. Event Trigger: Officer Approval & Completion
  it('Officer approves application -> Citizen receives APPLICATION_APPROVED notification', async () => {
    const apprvRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/approve`, {
      remarks: 'All documents verified and family income meets merit criterion.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(apprvRes.statusCode, 200);

    const citNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(citNotifs.data.notifications.some(n => n.type === 'APPLICATION_APPROVED' && n.applicationId === cit1AppId));
  });

  it('Officer completes application -> Citizen receives APPLICATION_COMPLETED notification', async () => {
    const compRes = await request('POST', `/api/v1/officer/applications/${cit1AppId}/complete`, {
      certificateUrl: 'https://storage.gov.in/certs/2026/EDU/scholarship_sanction.pdf',
      remarks: 'Scholarship disbursed via PFMS direct benefit transfer.'
    }, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(compRes.statusCode, 200);

    const citNotifs = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(citNotifs.data.notifications.some(n => n.type === 'APPLICATION_COMPLETED' && n.applicationId === cit1AppId));
  });

  // 9. Mark All as Read
  it('POST /api/v1/notifications/mark-all-read marks all user notifications as read', async () => {
    const res = await request('POST', '/api/v1/notifications/mark-all-read', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.updatedCount >= 1);

    const countRes = await request('GET', '/api/v1/notifications/unread-count', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(countRes.data.unreadCount, 0);
  });

  // 10. Archive Notification
  it('DELETE /api/v1/notifications/:id archives a notification from active view', async () => {
    const res = await request('DELETE', `/api/v1/notifications/${cit1NotifId}`, null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);

    const listRes = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(!listRes.data.notifications.some(n => n.id === cit1NotifId));
  });

  // 11. User Preferences API
  it('GET and PUT /api/v1/notifications/preferences manage channel settings', async () => {
    const getRes = await request('GET', '/api/v1/notifications/preferences', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.data.preferences.inAppEnabled, true);

    const putRes = await request('PUT', '/api/v1/notifications/preferences', {
      emailEnabled: true,
      smsEnabled: true
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(putRes.statusCode, 200);
    assert.equal(putRes.data.preferences.smsEnabled, true);
  });

  // 12. Officer Departmental Scoping
  it('Revenue Officer DOES NOT see Education specific task assignment notifications', async () => {
    const res = await request('GET', '/api/v1/notifications', null, {
      'Authorization': `Bearer ${revOfficerToken}`
    });
    assert.equal(res.statusCode, 200);
    // Revenue officer must NOT see cit1AppId (which is an EDUCATION service)
    assert.ok(!res.data.notifications.some(n => n.applicationId === cit1AppId && n.type === 'OFFICER_TASK_ASSIGNED'));
  });

  // 13. Admin System Alert Creation
  it('Admin can dispatch a system alert notification (POST /api/v1/notifications)', async () => {
    const res = await request('POST', '/api/v1/notifications', {
      recipientUserId: 'USR-CIT-001',
      recipientRole: 'CITIZEN',
      type: 'SYSTEM_ALERT',
      title: 'Scheduled Portal Maintenance',
      message: 'Platform services will undergo maintenance from 02:00 to 04:00 IST.',
      priority: 'HIGH',
      metadata: { maintenanceWindow: '02:00-04:00' }
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.notification.type, 'SYSTEM_ALERT');
  });

  // 14. Pagination and Status Filtering
  it('GET /api/v1/notifications supports pagination (limit, offset) and status filtering', async () => {
    const resPaged = await request('GET', '/api/v1/notifications?limit=2&offset=0', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resPaged.statusCode, 200);
    assert.equal(resPaged.data.limit, 2);
    assert.ok(resPaged.data.notifications.length <= 2);

    const resStatus = await request('GET', '/api/v1/notifications?status=READ', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resStatus.statusCode, 200);
    assert.ok(resStatus.data.notifications.every(n => n.status === 'READ'));
  });

  // 15. Workflow Resiliency
  it('Workflow Resiliency: Application submission succeeds even if notification creation throws an internal error', async () => {
    // Temporarily mutate db.notifications to simulate a temporary database fault
    const originalUnshift = db.notifications.unshift;
    db.notifications.unshift = () => { throw new Error('Simulated transient notification storage failure'); };

    try {
      const res = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001',
        formData: {
          fullName: 'Resilient Applicant',
          email: 'resilient@test.com',
          phone: '+91 98765 33333',
          address: '44 Senapati Bapat Road, Pune',
          district: 'Pune',
          state: 'Maharashtra',
          annualIncome: '180000',
          institution: 'Pune University',
          course: 'B.Tech IT',
          previousMarks: '85.6'
        },
        documents: [
          { name: 'College Admission Letter', fileName: 'admission_letter.pdf', fileSize: 1024, status: 'Uploaded' }
        ],
        status: 'SUBMITTED'
      }, { 'Authorization': `Bearer ${citizen1Token}` });

      // Application submission must still succeed despite notification failure!
      assert.equal(res.statusCode, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.application.id.startsWith('APP-2026-'));
    } finally {
      db.notifications.unshift = originalUnshift;
    }
  });

  // 16. UI Component Rendering
  it('renderNotifications renders alerts header, category tags, and application links', () => {
    const mockStore = {
      notifications: [
        {
          id: 'NOTIF-UI-01',
          title: 'Orchestration In Progress',
          category: 'Application',
          priority: 'NORMAL',
          message: 'Your Post-Matric Scholarship is undergoing verification.',
          status: 'UNREAD',
          unread: true,
          applicationId: 'APP-2026-EDU-8812',
          time: '10 mins ago'
        }
      ]
    };

    const html = renderNotifications(mockStore);
    assert.ok(html.includes('Notifications & System Alerts'));
    assert.ok(html.includes('Orchestration In Progress'));
    assert.ok(html.includes('APP-2026-EDU-8812'));
    assert.ok(html.includes('Mark All as Read'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
