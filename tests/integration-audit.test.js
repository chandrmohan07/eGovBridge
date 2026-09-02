import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { db } from '../server/db.js';
import { store } from '../public/js/store.js';
import { renderDashboardSummary } from '../public/js/components/DashboardSummary.js';
import { renderGovernmentServices } from '../public/js/components/GovernmentServices.js';
import { renderServiceDetails } from '../public/js/components/ServiceDetails.js';
import { renderOfficerWorkspace } from '../public/js/components/OfficerWorkspace.js';
import { renderAdminPortal } from '../public/js/components/AdminPortal.js';
import { renderAccessDenied } from '../public/js/components/AccessDenied.js';

describe('Comprehensive Phases 1–4 Full Integration Audit Suite', () => {
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

  it('Start integration test server', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // ============================================================================
  // 1. END-TO-END CITIZEN JOURNEY
  // ============================================================================
  describe('End-to-End Citizen Journey', () => {
    let citizenToken = '';
    const uniqueEmail = `integration_citizen_${Date.now()}@example.com`;

    it('Step 1: Citizen Registration with valid payload succeeds', async () => {
      const res = await request('POST', '/api/v1/auth/register', {
        name: 'Sunil Joshi',
        email: uniqueEmail,
        password: 'CitizenSecurePass@123',
        phone: '+91 91234 56789',
        state: 'Karnataka',
        district: 'Mysuru'
      });

      assert.equal(res.statusCode, 201);
      assert.ok(res.data.success);
      assert.ok(res.data.token);
      assert.equal(res.data.user.name, 'Sunil Joshi');
      assert.equal(res.data.user.role, 'CITIZEN');
      assert.equal(res.data.user.passwordHash, undefined, 'Must not expose passwordHash');
      assert.equal(res.data.user.salt, undefined, 'Must not expose salt');
      citizenToken = res.data.token;
    });

    it('Step 2: Citizen Login with newly registered credentials', async () => {
      const res = await request('POST', '/api/v1/auth/login', {
        email: uniqueEmail,
        password: 'CitizenSecurePass@123'
      });

      assert.equal(res.statusCode, 200);
      assert.ok(res.data.token);
      assert.equal(res.data.user.email, uniqueEmail);
      citizenToken = res.data.token;
    });

    it('Step 3: Retrieve current citizen profile (/api/v1/auth/me)', async () => {
      const res = await request('GET', '/api/v1/auth/me', null, citizenToken);
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.user.email, uniqueEmail);
      assert.equal(res.data.user.role, 'CITIZEN');
    });

    it('Step 4: Citizen views Dashboard summary UI', () => {
      const html = renderDashboardSummary(store);
      assert.ok(html.includes('Citizen Service Dashboard'));
      assert.ok(html.includes('Unified Digital Governance & Interoperability Layer'));
      assert.ok(html.includes('Active Applications'));
    });

    it('Step 5: Citizen searches Service Catalog for scholarships', async () => {
      const res = await request('GET', '/api/v1/services?search=scholarship', null, citizenToken);
      assert.equal(res.statusCode, 200);
      assert.ok(res.data.count >= 2);
      assert.ok(res.data.services.some(s => s.id === 'SRV-EDU-001'));
      assert.ok(res.data.services.every(s => 
        s.category.toLowerCase().includes('scholarship') || 
        s.title.toLowerCase().includes('scholarship') ||
        s.description.toLowerCase().includes('scholarship') ||
        (s.keywords && s.keywords.includes('scholarship'))
      ));
    });

    it('Step 6: Citizen applies combined Category and Availability filter', async () => {
      const res = await request('GET', '/api/v1/services?category=Scholarships&availability=Open', null, citizenToken);
      assert.equal(res.statusCode, 200);
      assert.ok(res.data.count >= 2);
      assert.ok(res.data.services.every(s => s.category === 'Scholarships' && s.applicationAvailability === 'Open'));
    });

    it('Step 7: Citizen inspects Service Details for SRV-EDU-001', async () => {
      const res = await request('GET', '/api/v1/services/SRV-EDU-001', null, citizenToken);
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.service.id, 'SRV-EDU-001');
      assert.equal(res.data.service.title, 'Post-Matric Scholarship for Higher Education');
      assert.ok(res.data.service.requiredDocuments.length >= 4);

      // Verify UI details rendering
      const detailsHtml = renderServiceDetails(store, 'SRV-EDU-001');
      assert.ok(detailsHtml.includes('Post-Matric Scholarship for Higher Education'));
      assert.ok(detailsHtml.includes('Who Can Apply'));
      assert.ok(detailsHtml.includes('Eligibility Criteria Checklist'));
      assert.ok(detailsHtml.includes('Required Documents Checklist'));
      assert.ok(detailsHtml.includes('Start Application'));
    });

    it('Step 8: Citizen Logout invalidates session token', async () => {
      const res = await request('POST', '/api/v1/auth/logout', null, citizenToken);
      assert.equal(res.statusCode, 200);

      // Subsequent attempt with revoked token must fail with 401
      const postLogoutRes = await request('GET', '/api/v1/auth/me', null, citizenToken);
      assert.equal(postLogoutRes.statusCode, 401);
    });
  });

  // ============================================================================
  // 2. END-TO-END OFFICER JOURNEY & DEPARTMENT ISOLATION
  // ============================================================================
  describe('End-to-End Officer Journey & Department Boundary', () => {
    let eduOfficerToken = '';
    let revOfficerToken = '';

    it('Education Officer logs in and receives departmental profile', async () => {
      const res = await request('POST', '/api/v1/auth/login', {
        email: 'officer.edu@gov.in',
        password: 'Officer@123'
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.user.role, 'OFFICER');
      assert.equal(res.data.user.departmentCode, 'EDUCATION');
      eduOfficerToken = res.data.token;
    });

    it('Education Officer accesses assigned department workspace (/api/v1/officer/workspace)', async () => {
      const res = await request('GET', '/api/v1/officer/workspace', null, eduOfficerToken);
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.departmentCode, 'EDUCATION');
      assert.ok(res.data.applicationsCount >= 2);
      assert.ok(res.data.applications.every(a => a.departmentCode === 'EDUCATION'));

      // Render Officer Workspace UI
      store.currentUser = res.data.officer;
      store.officerApplications = res.data.applications;
      const html = renderOfficerWorkspace(store);
      assert.ok(html.includes('Department Officer Workspace'));
      assert.ok(html.includes('Assigned: EDUCATION'));
      assert.ok(html.includes('APP-2026-EDU-8812'));
    });

    it('Education Officer attempting REVENUE department data is REJECTED (HTTP 403)', async () => {
      const res = await request('GET', '/api/v1/officer/department/REVENUE/applications', null, eduOfficerToken);
      assert.equal(res.statusCode, 403);
      assert.ok(res.data.error.includes('cannot access data for department: REVENUE'));
    });

    it('Revenue Officer logs in and accesses only REVENUE department data', async () => {
      const res = await request('POST', '/api/v1/auth/login', {
        email: 'officer.rev@gov.in',
        password: 'Officer@123'
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.user.departmentCode, 'REVENUE');
      revOfficerToken = res.data.token;

      // Access revenue department
      const deptRes = await request('GET', '/api/v1/officer/department/REVENUE/applications', null, revOfficerToken);
      assert.equal(deptRes.statusCode, 200);
      assert.ok(deptRes.data.applications.every(a => a.departmentCode === 'REVENUE'));

      // Revenue officer accessing EDUCATION department is REJECTED (HTTP 403)
      const eduAccessRes = await request('GET', '/api/v1/officer/department/EDUCATION/applications', null, revOfficerToken);
      assert.equal(eduAccessRes.statusCode, 403);
    });

    it('Officer attempting Admin routes is REJECTED (HTTP 403)', async () => {
      const res = await request('GET', '/api/v1/admin/users', null, eduOfficerToken);
      assert.equal(res.statusCode, 403);
    });
  });

  // ============================================================================
  // 3. END-TO-END ADMIN JOURNEY
  // ============================================================================
  describe('End-to-End Administrator Journey', () => {
    let adminToken = '';

    it('Administrator logs in and receives system-wide permissions', async () => {
      const res = await request('POST', '/api/v1/auth/login', {
        email: 'admin@gov.in',
        password: 'Admin@123'
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.user.role, 'ADMIN');
      adminToken = res.data.token;
    });

    it('Administrator can view all registered users (/api/v1/admin/users)', async () => {
      const res = await request('GET', '/api/v1/admin/users', null, adminToken);
      assert.equal(res.statusCode, 200);
      assert.ok(res.data.totalUsers >= 4);
      assert.ok(res.data.users.every(u => u.passwordHash === undefined));
    });

    it('Administrator can view all registered departments (/api/v1/admin/departments)', async () => {
      const res = await request('GET', '/api/v1/admin/departments', null, adminToken);
      assert.equal(res.statusCode, 200);
      assert.ok(res.data.departments.length >= 5);

      // Render Admin Portal UI
      store.adminUsersList = [
        { id: 'USR-CIT-001', name: 'Rahul Verma', email: 'citizen@example.com', role: 'CITIZEN' },
        { id: 'USR-ADM-001', name: 'Rajesh Nair', email: 'admin@gov.in', role: 'ADMIN' }
      ];
      store.adminDepartments = res.data.departments;
      const html = renderAdminPortal(store);
      assert.ok(html.includes('System Administration Portal'));
      assert.ok(html.includes('User Accounts & Role Assignments'));
      assert.ok(html.includes('Connected Department Directory'));
    });
  });

  // ============================================================================
  // 4. RBAC MATRIX & CLIENT ROUTE PROTECTION
  // ============================================================================
  describe('RBAC Security Matrix & Client-Side Guard UI', () => {
    it('renderAccessDenied component correctly displays 403 page', () => {
      store.currentUser = { name: 'Citizen User', email: 'citizen@example.com', role: 'CITIZEN', roleTitle: 'Citizen' };
      const html = renderAccessDenied(store, 'admin-overview');
      assert.ok(html.includes('HTTP 403 — Forbidden'));
      assert.ok(html.includes('Access Denied: Insufficient Permissions'));
      assert.ok(html.includes('Your current role (<strong>CITIZEN</strong>) does not have authorization'));
    });
  });

  // ============================================================================
  // 5. ERROR & EDGE CASE HANDLING
  // ============================================================================
  describe('Error Handling & Edge Cases', () => {
    it('Malformed JSON in POST request body returns 400 Bad Request', async () => {
      const res = await request('POST', '/api/v1/auth/login', '{ broken json: }');
      assert.equal(res.statusCode, 400);
      assert.ok(res.data.error.includes('Malformed JSON'));
    });

    it('Duplicate registration email returns 409 Conflict', async () => {
      const res = await request('POST', '/api/v1/auth/register', {
        name: 'Duplicate Test',
        email: 'citizen@example.com',
        password: 'Password@123'
      });
      assert.equal(res.statusCode, 409);
      assert.ok(res.data.error.includes('already exists'));
    });

    it('Short password during registration returns 400 Bad Request', async () => {
      const res = await request('POST', '/api/v1/auth/register', {
        name: 'Short Pass Test',
        email: `shortpass_${Date.now()}@example.com`,
        password: 'short'
      });
      assert.equal(res.statusCode, 400);
      assert.ok(res.data.error.includes('at least 8 characters'));
    });

    it('Missing authentication header on protected route returns 401 Unauthorized', async () => {
      const res = await request('GET', '/api/v1/auth/me');
      assert.equal(res.statusCode, 401);
      assert.ok(res.data.error.includes('Authentication token missing'));
    });

    it('Non-existent API route returns 404 Not Found', async () => {
      const res = await request('GET', '/api/v1/non-existent-endpoint');
      assert.equal(res.statusCode, 404);
      assert.ok(res.data.error.includes('API endpoint not found'));
    });
  });

  it('Stop integration test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
