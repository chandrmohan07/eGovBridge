import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { store } from '../public/js/store.js';
import { renderDashboardSummary } from '../public/js/components/DashboardSummary.js';
import { renderGovernmentServices } from '../public/js/components/GovernmentServices.js';
import { renderApplicationTracking } from '../public/js/components/ApplicationTracking.js';
import { renderAIHelp } from '../public/js/components/AIHelp.js';
import { renderEmploymentHub } from '../public/js/components/EmploymentHub.js';
import { renderScholarshipsHub } from '../public/js/components/ScholarshipsHub.js';
import { renderGovernmentSchemes } from '../public/js/components/GovernmentSchemes.js';
import { renderNewsAnnouncements } from '../public/js/components/NewsAnnouncements.js';
import { renderNotifications } from '../public/js/components/Notifications.js';
import { renderProfile } from '../public/js/components/Profile.js';
import { createServer } from '../scripts/dev-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

describe('Phase 2 — UI and Dashboard Foundation Verification', () => {

  it('All required frontend assets and stylesheets must exist', () => {
    const requiredFiles = [
      'index.html',
      'css/variables.css',
      'css/base.css',
      'css/layout.css',
      'css/components.css',
      'js/store.js',
      'js/app.js',
      'js/components/DashboardSummary.js',
      'js/components/GovernmentServices.js',
      'js/components/ApplicationTracking.js',
      'js/components/AIHelp.js',
      'js/components/EmploymentHub.js',
      'js/components/ScholarshipsHub.js',
      'js/components/GovernmentSchemes.js',
      'js/components/NewsAnnouncements.js',
      'js/components/Notifications.js',
      'js/components/Profile.js'
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(publicDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Missing required file: ${relPath}`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 50, `File ${relPath} is unexpectedly empty`);
    }
  });

  it('Store must provide complete data models for all 9 required dashboard sections', () => {
    assert.ok(Array.isArray(store.services) && store.services.length >= 5, 'Services catalog must contain at least 5 services');
    assert.ok(Array.isArray(store.applications) && store.applications.length >= 2, 'Applications list must contain tracked items');
    assert.ok(Array.isArray(store.aiHelpConversation) && store.aiHelpConversation.length >= 2, 'AI conversation must have initial entries');
    assert.ok(Array.isArray(store.employmentListings) && store.employmentListings.length >= 3, 'Employment listings must be populated');
    assert.ok(Array.isArray(store.scholarshipsListings) && store.scholarshipsListings.length >= 3, 'Scholarships listings must be populated');
    assert.ok(Array.isArray(store.schemesListings) && store.schemesListings.length >= 3, 'Schemes listings must be populated');
    assert.ok(Array.isArray(store.newsListings) && store.newsListings.length >= 3, 'News listings must be populated');
    assert.ok(Array.isArray(store.notifications) && store.notifications.length >= 3, 'Notifications list must be populated');
    assert.ok(store.citizenProfile && store.citizenProfile.role === 'Citizen', 'Citizen profile must be populated');
  });

  it('renderDashboardSummary must render metrics cards and interoperability banner', () => {
    const html = renderDashboardSummary(store);
    assert.ok(html.includes('Citizen Service Dashboard'), 'Missing dashboard title');
    assert.ok(html.includes('Unified Digital Governance & Interoperability Layer'), 'Missing interoperability banner');
    assert.ok(html.includes('Active Applications'), 'Missing active applications metric');
    assert.ok(html.includes('Featured Unified Services'), 'Missing featured services section');
  });

  it('renderGovernmentServices must render service cards and category filters', () => {
    const html = renderGovernmentServices(store);
    assert.ok(html.includes('Government Services Discovery'), 'Missing section header');
    assert.ok(html.includes('Education'), 'Missing category filter');
    assert.ok(html.includes('Post-Matric Scholarship for Higher Education'), 'Missing service card title');
    assert.ok(html.includes('Mock Adapter Active'), 'Missing mock adapter indicator');
  });

  it('renderApplicationTracking must render timeline stepper and interop audit logs', () => {
    const html = renderApplicationTracking(store);
    assert.ok(html.includes('Application Tracking & Status'), 'Missing tracking header');
    assert.ok(html.includes('APP-2026-EDU-8812'), 'Missing sample application ID');
    assert.ok(html.includes('Smart Orchestration'), 'Missing orchestration stage in timeline');
    assert.ok(html.includes('Interoperability Request sent to Revenue Adapter'), 'Missing interop log');
  });

  it('renderAIHelp must include grounded disclaimer and interactive suggestions', () => {
    const html = renderAIHelp(store);
    assert.ok(html.includes('AI Government Citizen Assistant'), 'Missing chatbot header');
    assert.ok(html.includes('Official AI Disclaimer:'), 'Missing mandatory grounding disclaimer');
    assert.ok(html.includes('does not make official government approval or rejection decisions'), 'Missing non-decision disclaimer');
    assert.ok(html.includes('chat-suggestions'), 'Missing prompt suggestions');
  });

  it('renderEmploymentHub must display verified opportunities with NCS source link', () => {
    const html = renderEmploymentHub(store);
    assert.ok(html.includes('National Employment & Apprenticeship Hub'), 'Missing hub header');
    assert.ok(html.includes('https://www.ncs.gov.in'), 'Missing official NCS source link');
    assert.ok(html.includes('National Informatics Centre'), 'Missing sample organization');
  });

  it('renderScholarshipsHub must display verified scholarships with NSP source link', () => {
    const html = renderScholarshipsHub(store);
    assert.ok(html.includes('National Scholarships Hub'), 'Missing scholarships header');
    assert.ok(html.includes('https://scholarships.gov.in'), 'Missing official NSP source link');
    assert.ok(html.includes('National Means-cum-Merit Scholarship'), 'Missing sample scholarship');
  });

  it('renderGovernmentSchemes must display schemes with myScheme source link', () => {
    const html = renderGovernmentSchemes(store);
    assert.ok(html.includes('Government Schemes Directory'), 'Missing schemes header');
    assert.ok(html.includes('https://www.myscheme.gov.in'), 'Missing official myScheme link');
    assert.ok(html.includes('Pradhan Mantri Kaushal Vikas Yojana'), 'Missing sample scheme');
  });

  it('renderNewsAnnouncements must display official announcements with PIB source link', () => {
    const html = renderNewsAnnouncements(store);
    assert.ok(html.includes('Official Announcements & News Feed'), 'Missing news header');
    assert.ok(html.includes('https://pib.gov.in'), 'Missing official PIB link');
    assert.ok(html.includes('Press Information Bureau'), 'Missing PIB attribution');
  });

  it('renderNotifications and renderProfile must display respective citizen records', () => {
    const notifHtml = renderNotifications(store);
    assert.ok(notifHtml.includes('Notifications & System Alerts'), 'Missing notifications header');
    assert.ok(notifHtml.includes('Orchestration In Progress'), 'Missing notification title');

    const profileHtml = renderProfile(store);
    assert.ok(profileHtml.includes('Citizen Profile & Identity'), 'Missing profile header');
    assert.ok(profileHtml.includes('Rahul Verma'), 'Missing citizen name');
    assert.ok(profileHtml.includes('Role: Citizen'), 'Missing citizen role');
    assert.ok(profileHtml.includes('Role-Based Access Control Architecture'), 'Missing Phase 3 role notice');
  });

  it('Static Dev Server should serve index.html, CSS, and JS successfully', async () => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = address.port;

    const fetchUrl = (pathUrl) => {
      return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}${pathUrl}`, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        }).on('error', reject);
      });
    };

    try {
      // Test root HTML
      const htmlRes = await fetchUrl('/');
      assert.equal(htmlRes.statusCode, 200);
      assert.ok(htmlRes.headers['content-type'].includes('text/html'));
      assert.ok(htmlRes.body.includes('National Unified Government Service Integration Platform'));

      // Test CSS
      const cssRes = await fetchUrl('/css/variables.css');
      assert.equal(cssRes.statusCode, 200);
      assert.ok(cssRes.headers['content-type'].includes('text/css'));
      assert.ok(cssRes.body.includes('--color-primary'));

      // Test JS module
      const jsRes = await fetchUrl('/js/store.js');
      assert.equal(jsRes.statusCode, 200);
      assert.ok(jsRes.headers['content-type'].includes('application/javascript'));
      assert.ok(jsRes.body.includes('export const store'));

      // Test 404 handler
      const notFoundRes = await fetchUrl('/non-existent-file.txt');
      assert.equal(notFoundRes.statusCode, 404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
