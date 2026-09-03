import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderEmploymentHub } from '../public/js/components/EmploymentHub.js';

describe('Phase 16 — Employment Hub Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let adminToken = '';
  let createdOppId = '';

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

  it('Start dev server with Employment Hub Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, and Admin', async () => {
    // 1. Citizen 1 Registration
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Vikas Patil',
      email: `emp_c1_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 66661',
      state: 'Maharashtra',
      district: 'Nashik'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Ananya Sen',
      email: `emp_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 66662',
      state: 'West Bengal',
      district: 'Kolkata'
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

  // 1. Opportunity Discovery & Listing
  it('GET /api/v1/employment/opportunities returns active opportunities with mock disclaimer', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.opportunities.length >= 5);
    assert.ok(res.data.disclaimer.includes('MOCK / DEMO DATA'));
    assert.ok(res.data.opportunities.some(o => o.id === 'EMP-2026-001'));
  });

  // 2. Keyword Search
  it('Search by keyword filters opportunities accurately', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities?search=Scientific%20Officer');
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.opportunities.length >= 1);
    assert.equal(res.data.opportunities[0].id, 'EMP-2026-001');
    assert.ok(res.data.opportunities[0].organization.includes('National Informatics Centre'));
  });

  // 3. Category & Qualification Filtering
  it('Filter by category returns matching opportunity types', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities?category=Apprenticeships');
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.opportunities.length >= 1);
    assert.ok(res.data.opportunities.every(o => o.category === 'Apprenticeships'));

    const resSchemes = await request('GET', '/api/v1/employment/opportunities?category=Employment%20Schemes');
    assert.equal(resSchemes.statusCode, 200);
    assert.ok(resSchemes.data.opportunities.some(o => o.title.includes('MGNREGS')));
  });

  it('Filter by qualification matches requirements', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities?qualification=Graduate');
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.opportunities.every(o => o.qualification.toLowerCase().includes('graduate')));
  });

  // 4. Single Opportunity Details
  it('GET /api/v1/employment/opportunities/:id returns detailed entity', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities/EMP-2026-001');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.opportunity.id, 'EMP-2026-001');
    assert.equal(res.data.opportunity.organization, 'National Informatics Centre (NIC)');
    assert.ok(Array.isArray(res.data.opportunity.skills));
  });

  it('GET /api/v1/employment/opportunities/:id on invalid ID returns HTTP 404', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities/EMP-NON-EXISTENT');
    assert.equal(res.statusCode, 404);
    assert.equal(res.data.success, false);
  });

  // 5. Bookmark / Save Opportunities
  it('Unauthenticated request to save opportunity returns HTTP 401', async () => {
    const res = await request('POST', '/api/v1/employment/saved/EMP-2026-001');
    assert.equal(res.statusCode, 401);
  });

  it('Citizen 1 can save/bookmark an opportunity (POST /api/v1/employment/saved/:id)', async () => {
    const res = await request('POST', '/api/v1/employment/saved/EMP-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);

    // Verify it appears in Citizen 1's saved list
    const listRes = await request('GET', '/api/v1/employment/saved', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(listRes.statusCode, 200);
    assert.ok(listRes.data.opportunities.some(o => o.id === 'EMP-2026-001'));
  });

  // 6. Cross-Citizen Security Isolation
  it('Citizen 2 CANNOT view Citizen 1 saved opportunities (Data Isolation)', async () => {
    const listRes = await request('GET', '/api/v1/employment/saved', null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(listRes.statusCode, 200);
    // Citizen 2 has saved nothing yet
    assert.equal(listRes.data.opportunities.length, 0);
  });

  // 7. Remove Saved Opportunity
  it('Citizen 1 can remove a saved opportunity (DELETE /api/v1/employment/saved/:id)', async () => {
    const res = await request('DELETE', '/api/v1/employment/saved/EMP-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);

    const listRes = await request('GET', '/api/v1/employment/saved', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(!listRes.data.opportunities.some(o => o.id === 'EMP-2026-001'));
  });

  // 8. Recommended Opportunities
  it('GET /api/v1/employment/opportunities/recommended provides scored suggestions', async () => {
    const res = await request('GET', '/api/v1/employment/opportunities/recommended', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.data.recommendations));
    assert.ok(res.data.disclaimer.includes('informational suggestions'));
  });

  // 9. Admin Opportunity Management
  it('Non-admin citizen CANNOT create an opportunity (HTTP 403 Forbidden)', async () => {
    const res = await request('POST', '/api/v1/employment/opportunities', {
      title: 'Unauthorized Job',
      organization: 'Fake Org',
      deadline: '2026-12-31'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Admin can create a new employment opportunity (POST /api/v1/employment/opportunities)', async () => {
    const res = await request('POST', '/api/v1/employment/opportunities', {
      title: 'Assistant Geologist',
      organization: 'Geological Survey of India (GSI)',
      department: 'Ministry of Mines',
      category: 'Government Jobs',
      opportunityType: 'JOB',
      description: 'Geological fieldwork, mineral mapping, and GIS modeling.',
      eligibility: 'Master Degree in Geological Science / Applied Geology.',
      qualification: 'Post-Graduate',
      skills: ['GIS', 'Geological Survey', 'Remote Sensing'],
      location: 'Nagpur / Kolkata / Hyderabad',
      vacancies: 35,
      salary: 'Level 8 (₹47,600 - ₹1,51,100)',
      deadline: '2026-11-30',
      applicationUrl: 'https://www.ncs.gov.in'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.ok(res.data.opportunity.id.startsWith('EMP-2026-'));
    createdOppId = res.data.opportunity.id;
  });

  it('Admin can update an existing opportunity (PUT /api/v1/employment/opportunities/:id)', async () => {
    const res = await request('PUT', `/api/v1/employment/opportunities/${createdOppId}`, {
      vacancies: 50,
      salary: 'Level 8 (₹47,600 - ₹1,51,100) + Special Hardship Allowance'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.opportunity.vacancies, 50);
  });

  it('Admin can deactivate an opportunity (DELETE /api/v1/employment/opportunities/:id)', async () => {
    const res = await request('DELETE', `/api/v1/employment/opportunities/${createdOppId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
  });

  // 10. AI Chatbot Integration
  it('AI Chatbot can answer employment questions using Employment Hub data', async () => {
    // Create session
    const sessRes = await request('POST', '/api/v1/chatbot/sessions', {}, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    const sessionId = sessRes.data.session.sessionId;

    const msgRes = await request('POST', `/api/v1/chatbot/sessions/${sessionId}/messages`, {
      message: 'Show me government jobs and opportunities'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });

    assert.equal(msgRes.statusCode, 200);
    assert.ok(msgRes.data.reply.text.includes('National Career Service') || msgRes.data.reply.text.includes('Scientific Officer') || msgRes.data.reply.text.includes('SSC'));
    assert.ok(msgRes.data.reply.sources.some(s => s.includes('Employment Hub')));
  });

  // 11. UI Component Rendering
  it('renderEmploymentHub renders header, source links, mock badges, and organization details', () => {
    const mockStore = {
      searchQuery: '',
      employmentCategory: 'ALL',
      employmentListings: [
        {
          id: 'EMP-2026-001',
          title: 'Scientific Officer / Technical Assistant (IT)',
          organization: 'National Informatics Centre',
          category: 'Government Jobs',
          eligibility: 'B.Tech / MCA',
          location: 'New Delhi',
          vacancies: 45,
          salary: 'Level 10',
          deadline: '2026-09-25',
          source: 'National Career Service (NCS)',
          sourceUrl: 'https://www.ncs.gov.in',
          isSaved: false,
          closingSoon: true
        }
      ]
    };

    const html = renderEmploymentHub(mockStore);
    assert.ok(html.includes('National Employment & Apprenticeship Hub'));
    assert.ok(html.includes('https://www.ncs.gov.in'));
    assert.ok(html.includes('National Informatics Centre'));
    assert.ok(html.includes('MOCK / DEMO DATA'));
    assert.ok(html.includes('Closing Soon'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
