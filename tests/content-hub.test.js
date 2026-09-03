import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { renderScholarshipsHub } from '../public/js/components/ScholarshipsHub.js';
import { renderGovernmentSchemes } from '../public/js/components/GovernmentSchemes.js';
import { renderNewsAnnouncements } from '../public/js/components/NewsAnnouncements.js';

describe('Phase 17 — Scholarship, Government Scheme & News Hub Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let adminToken = '';

  let createdSchId = '';
  let createdSchemeId = '';
  let createdAnnId = '';

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

  it('Start dev server with Content Hub Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Citizen 1, Citizen 2, and Admin', async () => {
    // 1. Citizen 1 Registration
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Rohan Sharma',
      email: `hub_c1_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 77771',
      state: 'Karnataka',
      district: 'Bengaluru'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Pooja Nair',
      email: `hub_c2_${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '+91 98765 77772',
      state: 'Kerala',
      district: 'Kochi'
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
  // 1. SCHOLARSHIPS API
  // ==========================================
  it('GET /api/v1/content/scholarships returns verified listings with mock disclaimer', async () => {
    const res = await request('GET', '/api/v1/content/scholarships');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.scholarships.length >= 3);
    assert.ok(res.data.disclaimer.includes('MOCK / DEMO DATA'));
    assert.equal(res.data.source, 'National Scholarship Portal (NSP)');
  });

  it('Search scholarships by keyword and filter by category', async () => {
    // Keyword search
    const resSearch = await request('GET', '/api/v1/content/scholarships?search=Pragati');
    assert.equal(resSearch.statusCode, 200);
    assert.ok(resSearch.data.scholarships.length >= 1);
    assert.equal(resSearch.data.scholarships[0].id, 'SCH-2026-003');

    // Category filter
    const resCat = await request('GET', '/api/v1/content/scholarships?category=Need-based');
    assert.equal(resCat.statusCode, 200);
    assert.ok(resCat.data.scholarships.some(s => s.id === 'SCH-2026-001'));
  });

  it('GET /api/v1/content/scholarships/:id returns detailed metadata, vault status, and related service', async () => {
    const res = await request('GET', '/api/v1/content/scholarships/SCH-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.scholarship.id, 'SCH-2026-001');
    assert.ok(res.data.scholarship.relatedService);
    assert.equal(res.data.scholarship.relatedService.id, 'SRV-EDU-001');
    assert.ok(Array.isArray(res.data.scholarship.vaultStatus));
  });

  it('GET /api/v1/content/scholarships/:id on invalid ID returns HTTP 404', async () => {
    const res = await request('GET', '/api/v1/content/scholarships/SCH-NON-EXISTENT');
    assert.equal(res.statusCode, 404);
  });

  it('Citizen 1 can save scholarship and view saved list', async () => {
    const saveRes = await request('POST', '/api/v1/content/scholarships/saved/SCH-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(saveRes.statusCode, 200);
    assert.equal(saveRes.data.success, true);

    const listRes = await request('GET', '/api/v1/content/scholarships/saved', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(listRes.statusCode, 200);
    assert.ok(listRes.data.scholarships.some(s => s.id === 'SCH-2026-001'));
  });

  it('Citizen 2 CANNOT view Citizen 1 saved scholarships (Strict Isolation)', async () => {
    const listRes = await request('GET', '/api/v1/content/scholarships/saved', null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(listRes.statusCode, 200);
    assert.equal(listRes.data.scholarships.length, 0);
  });

  it('Citizen 1 can remove saved scholarship', async () => {
    const delRes = await request('DELETE', '/api/v1/content/scholarships/saved/SCH-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(delRes.statusCode, 200);

    const listRes = await request('GET', '/api/v1/content/scholarships/saved', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(!listRes.data.scholarships.some(s => s.id === 'SCH-2026-001'));
  });

  // ==========================================
  // 2. GOVERNMENT SCHEMES API
  // ==========================================
  it('GET /api/v1/content/schemes returns verified schemes with myScheme source', async () => {
    const res = await request('GET', '/api/v1/content/schemes');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.schemes.length >= 3);
    assert.equal(res.data.source, 'myScheme Portal');
    assert.ok(res.data.disclaimer.includes('MOCK / DEMO DATA'));
  });

  it('Search schemes by keyword and filter by department', async () => {
    const resSearch = await request('GET', '/api/v1/content/schemes?search=SVANidhi');
    assert.equal(resSearch.statusCode, 200);
    assert.ok(resSearch.data.schemes.some(s => s.id === 'SCHEME-2026-002'));

    const resDept = await request('GET', '/api/v1/content/schemes?department=Ministry%20of%20Agriculture');
    assert.equal(resDept.statusCode, 200);
    assert.ok(resDept.data.schemes.some(s => s.id === 'SCHEME-2026-003'));
  });

  it('GET /api/v1/content/schemes/:id returns scheme details with linked service', async () => {
    const res = await request('GET', '/api/v1/content/schemes/SCHEME-2026-003');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.scheme.id, 'SCHEME-2026-003');
    assert.ok(res.data.scheme.relatedService);
    assert.equal(res.data.scheme.relatedService.id, 'SRV-AGR-005');
  });

  it('Citizen 1 can save and remove a scheme bookmark', async () => {
    const saveRes = await request('POST', '/api/v1/content/schemes/saved/SCHEME-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(saveRes.statusCode, 200);

    const listRes = await request('GET', '/api/v1/content/schemes/saved', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.ok(listRes.data.schemes.some(s => s.id === 'SCHEME-2026-001'));

    const delRes = await request('DELETE', '/api/v1/content/schemes/saved/SCHEME-2026-001', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  // ==========================================
  // 3. ANNOUNCEMENTS & NEWS API
  // ==========================================
  it('GET /api/v1/content/announcements returns news sorted by date with PIB source', async () => {
    const res = await request('GET', '/api/v1/content/announcements');
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.announcements.length >= 3);
    assert.equal(res.data.source, 'Press Information Bureau (PIB)');
    assert.ok(res.data.announcements.some(a => a.id === 'NEWS-2026-001'));
  });

  it('Search announcements by keyword and filter by category', async () => {
    const res = await request('GET', '/api/v1/content/announcements?category=Deadlines');
    assert.equal(res.statusCode, 200);
    assert.ok(res.data.announcements.every(a => a.category === 'Deadlines'));
  });

  it('GET /api/v1/content/announcements/:id returns announcement content', async () => {
    const res = await request('GET', '/api/v1/content/announcements/NEWS-2026-001');
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.announcement.id, 'NEWS-2026-001');
    assert.ok(res.data.announcement.content.length > 10);
  });

  // ==========================================
  // 4. ADMIN MANAGEMENT & RBAC PROTECTION
  // ==========================================
  it('Citizen CANNOT create content (HTTP 403 Forbidden)', async () => {
    const resSch = await request('POST', '/api/v1/content/scholarships', {
      title: 'Unauthorized Scholarship',
      deadline: '2026-12-31'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resSch.statusCode, 403);

    const resSc = await request('POST', '/api/v1/content/schemes', {
      title: 'Unauthorized Scheme',
      benefits: 'Fake Benefits'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resSc.statusCode, 403);

    const resAnn = await request('POST', '/api/v1/content/announcements', {
      title: 'Unauthorized News'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(resAnn.statusCode, 403);
  });

  it('Admin can create, update, and deactivate a scholarship', async () => {
    // Create
    const createRes = await request('POST', '/api/v1/content/scholarships', {
      title: 'National Overseas Scholarship for Higher Studies',
      provider: 'Ministry of Social Justice & Empowerment',
      benefitAmount: 'Full Tuition + Monthly Allowance',
      eligibility: 'Meritorious students for pursuing Masters/Ph.D abroad',
      deadline: '2026-11-30'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(createRes.statusCode, 201);
    createdSchId = createRes.data.scholarship.id;

    // Update
    const updateRes = await request('PUT', `/api/v1/content/scholarships/${createdSchId}`, {
      deadline: '2026-12-15'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.data.scholarship.deadline, '2026-12-15');

    // Deactivate
    const delRes = await request('DELETE', `/api/v1/content/scholarships/${createdSchId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  it('Admin can create, update, and deactivate a government scheme', async () => {
    // Create
    const createRes = await request('POST', '/api/v1/content/schemes', {
      title: 'Stand-Up India Scheme',
      department: 'Department of Financial Services',
      category: 'Financial Inclusion',
      benefits: 'Bank loans between ₹10 lakh and ₹1 crore for greenfield enterprises',
      targetAudience: 'SC/ST and women entrepreneurs'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(createRes.statusCode, 201);
    createdSchemeId = createRes.data.scheme.id;

    // Update
    const updateRes = await request('PUT', `/api/v1/content/schemes/${createdSchemeId}`, {
      benefits: 'Bank loans between ₹10 lakh and ₹1.5 crore with interest concession'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(updateRes.statusCode, 200);

    // Deactivate
    const delRes = await request('DELETE', `/api/v1/content/schemes/${createdSchemeId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  it('Admin can create, update, and archive an announcement', async () => {
    // Create
    const createRes = await request('POST', '/api/v1/content/announcements', {
      title: 'Portal Scheduled Maintenance Notice',
      summary: 'Brief maintenance window scheduled for midnight 15th September.',
      department: 'National Informatics Centre'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(createRes.statusCode, 201);
    createdAnnId = createRes.data.announcement.id;

    // Update
    const updateRes = await request('PUT', `/api/v1/content/announcements/${createdAnnId}`, {
      summary: 'Maintenance window rescheduled to 20th September.'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(updateRes.statusCode, 200);

    // Archive
    const delRes = await request('DELETE', `/api/v1/content/announcements/${createdAnnId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(delRes.statusCode, 200);
  });

  // ==========================================
  // 5. AI CHATBOT INTEGRATION
  // ==========================================
  it('AI Chatbot answers queries regarding scholarships, schemes, and announcements', async () => {
    const sessRes = await request('POST', '/api/v1/chatbot/sessions', {}, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    const sessionId = sessRes.data.session.sessionId;

    // Scholarship Query
    const schRes = await request('POST', `/api/v1/chatbot/sessions/${sessionId}/messages`, {
      message: 'What scholarships are available for girl students?'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(schRes.statusCode, 200);
    assert.ok(schRes.data.reply.sources.some(s => s.includes('National Scholarship Portal')));

    // Government Scheme Query
    const scRes = await request('POST', `/api/v1/chatbot/sessions/${sessionId}/messages`, {
      message: 'Tell me about the PM SVANidhi welfare scheme'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(scRes.statusCode, 200);
    assert.ok(scRes.data.reply.sources.some(s => s.includes('myScheme Portal')));

    // Announcement Query
    const newsRes = await request('POST', `/api/v1/chatbot/sessions/${sessionId}/messages`, {
      message: 'Are there any recent news announcements or circulars?'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(newsRes.statusCode, 200);
    assert.ok(newsRes.data.reply.sources.some(s => s.includes('Press Information Bureau')));
  });

  // ==========================================
  // 6. UI COMPONENT RENDERING
  // ==========================================
  it('renderScholarshipsHub, renderGovernmentSchemes, and renderNewsAnnouncements render properly', () => {
    const mockStore = {
      searchQuery: '',
      scholarshipTab: 'ALL',
      schemesTab: 'ALL',
      scholarshipsListings: [
        {
          id: 'SCH-2026-001',
          title: 'National Means-cum-Merit Scholarship Scheme (NMMSS)',
          ministry: 'Ministry of Education',
          benefitAmount: '₹12,000 per annum',
          eligibility: 'Class 9th to 12th students',
          deadline: '2026-09-30',
          source: 'National Scholarship Portal',
          sourceUrl: 'https://scholarships.gov.in',
          isSaved: false,
          closingSoon: true
        }
      ],
      schemesListings: [
        {
          id: 'SCHEME-2026-001',
          title: 'Pradhan Mantri Kaushal Vikas Yojana 4.0 (PMKVY)',
          department: 'Ministry of Skill Development & Entrepreneurship',
          category: 'Skill Development',
          benefits: 'Free certification and placement',
          targetAudience: 'Youth',
          source: 'myScheme Portal',
          sourceUrl: 'https://www.myscheme.gov.in',
          isSaved: false
        }
      ],
      newsListings: [
        {
          id: 'NEWS-2026-001',
          title: 'Ministry of Education extends deadline for Central Sector Scholarships',
          category: 'Deadlines',
          publishedAt: '2026-09-02',
          snippet: 'Applications extended to October 15.',
          source: 'Press Information Bureau (PIB)',
          sourceUrl: 'https://pib.gov.in'
        }
      ]
    };

    const schHtml = renderScholarshipsHub(mockStore);
    assert.ok(schHtml.includes('National Scholarships Hub'));
    assert.ok(schHtml.includes('https://scholarships.gov.in'));
    assert.ok(schHtml.includes('National Means-cum-Merit Scholarship'));
    assert.ok(schHtml.includes('Closing Soon'));

    const scHtml = renderGovernmentSchemes(mockStore);
    assert.ok(scHtml.includes('Government Schemes Directory'));
    assert.ok(scHtml.includes('https://www.myscheme.gov.in'));
    assert.ok(scHtml.includes('Pradhan Mantri Kaushal Vikas Yojana'));

    const newsHtml = renderNewsAnnouncements(mockStore);
    assert.ok(newsHtml.includes('Official Announcements & News Feed'));
    assert.ok(newsHtml.includes('https://pib.gov.in'));
    assert.ok(newsHtml.includes('Press Information Bureau'));
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
