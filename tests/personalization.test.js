import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderDashboardSummary } from '../public/js/components/DashboardSummary.js';

describe('Phase 18 — Personalized Information System Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
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

  it('Start dev server with Personalization Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, and Admin', async () => {
    // 1. Citizen 1 Registration (Student in Maharashtra)
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Aditya Kulkarni',
      email: `pers_c1_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 88881',
      state: 'Maharashtra',
      district: 'Pune'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration (Farmer in West Bengal)
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Subhash Roy',
      email: `pers_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 88882',
      state: 'West Bengal',
      district: 'Burdwan'
    });
    assert.equal(c2.statusCode, 201);
    citizen2Token = c2.data.token;

    // 3. Admin Login
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;
  });

  // ==========================================
  // 1. PREFERENCES CONTROLS
  // ==========================================
  it('GET /api/v1/personalization/preferences returns defaults derived from user profile', async () => {
    const res = await request('GET', '/api/v1/personalization/preferences', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.preferences.enabled, true);
    assert.equal(res.data.preferences.preferredLocation, 'Maharashtra');
  });

  it('Citizen 1 updates preferences (PUT /api/v1/personalization/preferences)', async () => {
    const res = await request('PUT', '/api/v1/personalization/preferences', {
      persona: 'STUDENT',
      educationLevel: 'Undergraduate',
      qualification: 'B.Tech / B.E.',
      skills: ['IT', 'Computer Science'],
      serviceInterests: ['Education', 'Scholarships']
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.preferences.persona, 'STUDENT');
    assert.equal(res.data.preferences.qualification, 'B.Tech / B.E.');
  });

  it('Citizen 2 updates preferences with Farmer persona', async () => {
    const res = await request('PUT', '/api/v1/personalization/preferences', {
      persona: 'FARMER',
      schemeCategories: ['Agriculture', 'Financial Inclusion'],
      preferredLocation: 'West Bengal'
    }, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.preferences.persona, 'FARMER');
  });

  it('Cross-Citizen Isolation: Preferences are strictly isolated per citizen', async () => {
    const res1 = await request('GET', '/api/v1/personalization/preferences', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    const res2 = await request('GET', '/api/v1/personalization/preferences', null, {
      'Authorization': `Bearer ${citizen2Token}`
    });

    assert.equal(res1.data.preferences.persona, 'STUDENT');
    assert.equal(res2.data.preferences.persona, 'FARMER');
  });

  // ==========================================
  // 2. SCENARIO A: STUDENT PROFILE
  // ==========================================
  it('Scenario A: Student Profile prioritizes scholarships with explainable reasons', async () => {
    const res = await request('GET', '/api/v1/personalization/scholarships', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.scholarships.length >= 1);

    const top = res.data.scholarships[0];
    assert.ok(top.relevanceScore > 0);
    assert.ok(Array.isArray(top.recommendationReasons));
    assert.ok(top.recommendationReasons.some(r => r.includes('Student profile') || r.includes('education')));
    assert.ok(top.disclaimer.includes('does NOT guarantee official eligibility'));
  });

  // ==========================================
  // 3. SCENARIO B: JOB SEEKER PROFILE
  // ==========================================
  it('Scenario B: Job Seeker Profile prioritizes verified employment opportunities', async () => {
    // Update Citizen 1 to Job Seeker
    await request('PUT', '/api/v1/personalization/preferences', {
      persona: 'JOB_SEEKER',
      qualification: 'Graduate',
      skills: ['Python', 'Cloud Infrastructure'],
      employmentInterests: ['Government Jobs']
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    const res = await request('GET', '/api/v1/personalization/employment', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.employment.length >= 1);

    const top = res.data.employment[0];
    assert.equal(top.id, 'EMP-2026-001'); // Scientific Officer NIC (IT)
    assert.ok(top.recommendationReasons.some(r => r.includes('Job Seeker') || r.includes('qualification')));
  });

  // ==========================================
  // 4. SCENARIO C: FARMER PROFILE
  // ==========================================
  it('Scenario C: Farmer Profile prioritizes agriculture schemes', async () => {
    const res = await request('GET', '/api/v1/personalization/schemes', null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.schemes.length >= 1);

    const top = res.data.schemes[0];
    assert.equal(top.id, 'SCHEME-2026-003'); // Pradhan Mantri Fasal Bima Yojana
    assert.ok(top.recommendationReasons.some(r => r.includes('Farmer profile') || r.includes('Agriculture')));
  });

  // ==========================================
  // 5. RECOMMENDATION CONTROLS (DISMISS & RESTORE)
  // ==========================================
  it('Citizen can dismiss a recommendation and restore it', async () => {
    // 1. Dismiss EMP-2026-001
    const disRes = await request('POST', '/api/v1/personalization/dismiss/EMP-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(disRes.statusCode, 200);
    assert.equal(disRes.data.success, true);

    // Verify it is excluded
    const listAfter = await request('GET', '/api/v1/personalization/employment', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(!listAfter.data.employment.some(e => e.id === 'EMP-2026-001'));

    // 2. Restore EMP-2026-001
    const restRes = await request('DELETE', '/api/v1/personalization/dismiss/EMP-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(restRes.statusCode, 200);

    // Verify it reappears
    const listRestored = await request('GET', '/api/v1/personalization/employment', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(listRestored.data.employment.some(e => e.id === 'EMP-2026-001'));
  });

  // ==========================================
  // 6. PERSONALIZATION MASTER TOGGLE
  // ==========================================
  it('Disabling personalization returns empty recommendations with status flag', async () => {
    // Disable
    await request('PUT', '/api/v1/personalization/preferences', {
      enabled: false
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    const res = await request('GET', '/api/v1/personalization/scholarships', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.enabled, false);
    assert.equal(res.data.scholarships.length, 0);

    // Re-enable
    await request('PUT', '/api/v1/personalization/preferences', {
      enabled: true
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
  });

  // ==========================================
  // 7. COMBINED DASHBOARD & ACTION CARDS
  // ==========================================
  it('GET /api/v1/personalization/dashboard provides unified recommendations and action cards', async () => {
    const res = await request('GET', '/api/v1/personalization/dashboard', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.actionCards));
    assert.ok(res.data.recommendations.services);
    assert.ok(res.data.recommendations.scholarships);
    assert.ok(res.data.disclaimer.includes('does NOT guarantee official eligibility'));
  });

  // ==========================================
  // 8. ADMIN AGGREGATED METRICS
  // ==========================================
  it('Citizen CANNOT access admin personalization metrics (HTTP 403)', async () => {
    const res = await request('GET', '/api/v1/personalization/metrics', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Admin can view aggregated personalization metrics', async () => {
    const res = await request('GET', '/api/v1/personalization/metrics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.metrics.totalCitizenProfiles >= 2);
    assert.ok(res.data.metrics.personalizationEnabledRate);
    assert.ok(res.data.metrics.personaDistribution);
  });

  // ==========================================
  // 9. AI CHATBOT INTEGRATION
  // ==========================================
  it('AI Chatbot answers personalized queries using citizen profile preferences', async () => {
    const sessRes = await request('POST', '/api/v1/chatbot/sessions', {}, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    const sessionId = sessRes.data.session.sessionId;

    const msgRes = await request('POST', `/api/v1/chatbot/sessions/${sessionId}/messages`, {
      message: 'What government opportunities are relevant to me based on my preferences?'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(msgRes.statusCode, 200);
    assert.ok(msgRes.data.reply.text.includes('Personalized Portal Recommendations'));
    assert.ok(msgRes.data.reply.sources.some(s => s.includes('Personalized Recommendations')));
  });

  // ==========================================
  // 10. UI COMPONENT RENDERING
  // ==========================================
  it('renderDashboardSummary renders persona badge and dashboard elements properly', () => {
    const mockStore = {
      citizenProfile: { name: 'Aditya Kulkarni' },
      dashboardSummary: {
        activeApplications: 1,
        eligibleScholarships: 2,
        vaultDocuments: 3
      },
      applications: [
        {
          id: 'APP-2026-EDU-8812',
          serviceName: 'Post-Matric Scholarship for Higher Education',
          department: 'Department of Higher Education',
          currentStatus: 'UNDER_REVIEW',
          lastUpdated: '2026-09-03'
        }
      ],
      personalization: {
        enabled: true,
        preferences: { persona: 'STUDENT' },
        actionCards: [
          {
            id: 'ACT-VAULT-INCOME',
            title: 'Upload Income Certificate to Vault',
            priority: 'LOW',
            message: 'Enable 1-click verification',
            actionLabel: 'Open Document Vault',
            targetTab: 'vault'
          }
        ]
      },
      services: [
        {
          id: 'SRV-EDU-001',
          title: 'Post-Matric Scholarship for Higher Education',
          department: 'Department of Higher Education',
          integrationStatus: 'Fully Interoperable',
          description: 'Financial assistance for students',
          requiredDocuments: ['Income Certificate'],
          turnaroundTime: '5-7 working days'
        }
      ]
    };

    const html = renderDashboardSummary(mockStore);
    assert.ok(html.includes('Citizen Service Dashboard'));
    assert.ok(html.includes('Interoperability Gateway: Active'));
    assert.ok(html.includes('Persona: STUDENT'));
    assert.ok(html.includes('Upload Income Certificate to Vault'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
