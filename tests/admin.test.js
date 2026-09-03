import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderAdminDashboard } from '../public/js/components/AdminDashboard.js';

describe('Phase 20 — Admin Dashboard & Analytics Verification', () => {
  let server;
  let port;

  let adminToken = '';
  let citizenToken = '';
  let officerToken = '';

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

  it('Start dev server with Admin Analytics Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Admin, Citizen, and Officer', async () => {
    // 1. Admin Login
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;

    // 2. Citizen Login
    const cit = await request('POST', '/api/v1/auth/login', {
      email: 'citizen@example.com',
      password: 'Citizen@123'
    });
    assert.equal(cit.statusCode, 200);
    citizenToken = cit.data.token;

    // 3. Officer Login
    const off = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(off.statusCode, 200);
    officerToken = off.data.token;
  });

  // ==========================================
  // 1. RBAC & SECURITY PROTECTION
  // ==========================================
  it('Unauthenticated request to admin dashboard returns HTTP 401 Unauthorized', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard');
    assert.equal(res.statusCode, 401);
  });

  it('Citizen access to admin dashboard returns HTTP 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  it('Officer access to admin dashboard returns HTTP 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', null, {
      'Authorization': `Bearer ${officerToken}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  it('Citizen access to application analytics returns HTTP 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/admin/applications/analytics', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Citizen access to platform health returns HTTP 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/admin/platform-health', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Citizen access to export returns HTTP 403 Forbidden', async () => {
    const res = await request('GET', '/api/v1/admin/export', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  // ==========================================
  // 2. ADMIN DASHBOARD OVERVIEW
  // ==========================================
  it('Admin retrieves platform overview summary (GET /api/v1/admin/dashboard)', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.summary.totalCitizens >= 1);
    assert.ok(res.data.summary.totalOfficers >= 1);
    assert.equal(res.data.summary.totalDepartments, 5);
    assert.ok(res.data.summary.totalServices >= 5);
    assert.ok(res.data.summary.totalApplications >= 1);
    assert.ok(res.data.summary.totalVaultDocuments >= 1);
    assert.ok(res.data.summary.averageCitizenFeedback);
    assert.ok(res.data.systemEnvironment.nodeVersion);
  });

  // ==========================================
  // 3. APPLICATION ANALYTICS
  // ==========================================
  it('Admin retrieves application analytics with breakdown (GET /api/v1/admin/applications/analytics)', async () => {
    const res = await request('GET', '/api/v1/admin/applications/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.total >= 1);
    assert.ok(res.data.byStatus);
    assert.ok(res.data.byDepartment);
    assert.ok(Array.isArray(res.data.applications));
  });

  // ==========================================
  // 4. DEPARTMENT ANALYTICS & WORKLOAD
  // ==========================================
  it('Admin retrieves departmental workloads & SLA compliance (GET /api/v1/admin/departments/analytics)', async () => {
    const res = await request('GET', '/api/v1/admin/departments/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.totalDepartments, 5);
    assert.ok(Array.isArray(res.data.departments));

    const eduDept = res.data.departments.find(d => d.code === 'EDUCATION');
    assert.ok(eduDept);
    assert.ok(eduDept.name.includes('Education'));
    assert.ok(eduDept.slaComplianceRate);
  });

  // ==========================================
  // 5. OFFICER WORKLOAD ANALYTICS
  // ==========================================
  it('Admin retrieves officer analytics without exposing sensitive credentials (GET /api/v1/admin/officers/analytics)', async () => {
    const res = await request('GET', '/api/v1/admin/officers/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.totalOfficers >= 1);
    assert.ok(Array.isArray(res.data.workloads));

    for (const off of res.data.workloads) {
      assert.equal(off.passwordHash, undefined);
      assert.equal(off.salt, undefined);
      assert.ok(off.officerId);
      assert.ok(off.departmentCode);
    }
  });

  // ==========================================
  // 6. SERVICE PERFORMANCE VIEW
  // ==========================================
  it('Admin retrieves service performance & feedback ratings (GET /api/v1/admin/services/analytics)', async () => {
    const res = await request('GET', '/api/v1/admin/services/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.totalServices >= 5);
    assert.ok(Array.isArray(res.data.services));

    const srv = res.data.services[0];
    assert.ok(srv.serviceId);
    assert.ok(srv.title);
    assert.ok(srv.turnaroundTimeTarget);
  });

  // ==========================================
  // 7. WORKFLOW & ORCHESTRATION ANALYTICS
  // ==========================================
  it('Admin retrieves workflow orchestration metrics & bottlenecks (GET /api/v1/admin/workflows/analytics)', async () => {
    const res = await request('GET', '/api/v1/admin/workflows/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.byStatus);
    assert.ok(Array.isArray(res.data.activeBottlenecks));
  });

  // ==========================================
  // 8. INTER-DEPARTMENT EXCHANGE ANALYTICS
  // ==========================================
  it('Admin retrieves data exchange transfer analytics (GET /api/v1/admin/exchanges/analytics)', async () => {
    const res = await request('GET', '/api/v1/admin/exchanges/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.byStatus);
    assert.ok(res.data.bySourceDepartment);
  });

  // ==========================================
  // 9. TECHNICAL PLATFORM HEALTH OVERVIEW
  // ==========================================
  it('Admin retrieves comprehensive platform health overview (GET /api/v1/admin/platform-health)', async () => {
    const res = await request('GET', '/api/v1/admin/platform-health', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.status, 'HEALTHY');
    assert.ok(res.data.components.apiGateway);
    assert.ok(res.data.components.database);
    assert.ok(res.data.components.authentication);
    assert.ok(res.data.components.documentVault);
    assert.ok(res.data.components.notificationEngine);
    assert.ok(res.data.components.orchestrationEngine);
    assert.ok(res.data.components.departmentAdapters);
  });

  // ==========================================
  // 10. EXPORT AGGREGATED REPORTS
  // ==========================================
  it('Admin exports non-sensitive aggregated reports (GET /api/v1/admin/export)', async () => {
    const res = await request('GET', '/api/v1/admin/export?type=DEPARTMENTS&format=json', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.reportType, 'DEPARTMENTS');
    assert.ok(Array.isArray(res.data.data));
  });

  // ==========================================
  // 11. UI COMPONENT RENDERING
  // ==========================================
  it('renderAdminDashboard renders executive overview, metrics, health, and tables properly', () => {
    const mockStore = {
      adminOverview: {
        totalCitizens: 50,
        totalOfficers: 15,
        totalDepartments: 5,
        totalApplications: 30,
        pendingApplications: 10,
        completedApplications: 18,
        activeGrievances: 2,
        resolvedGrievances: 8,
        totalNotifications: 90,
        totalVaultDocuments: 40,
        totalExchanges: 20,
        averageCitizenFeedback: '4.9'
      },
      adminDepartments: [
        {
          code: 'EDUCATION',
          name: 'Department of Higher Education',
          ministry: 'Ministry of Education',
          totalApplications: 15,
          pendingApplications: 5,
          completedApplications: 10,
          activeOfficersCount: 14,
          activeGrievancesCount: 1,
          slaComplianceRate: '95%'
        }
      ]
    };

    const html = renderAdminDashboard(mockStore);
    assert.ok(html.includes('Central Platform Administration & Analytics'));
    assert.ok(html.includes('Superadmin View'));
    assert.ok(html.includes('Total Citizens'));
    assert.ok(html.includes('Department Workload & SLA Performance'));
    assert.ok(html.includes('Department of Higher Education'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
