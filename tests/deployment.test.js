import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createServer } from '../scripts/dev-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Phase 24 — Deployment & Production Setup Verification', () => {
  let server;
  let port;

  const request = (method, pathUrl, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const reqHeaders = { ...headers };
      let payload = null;
      if (body) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
        if (!reqHeaders['Content-Length']) reqHeaders['Content-Length'] = Buffer.byteLength(payload);
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
      if (payload) req.write(payload);
      req.end();
    });
  };

  it('Start production dev server instance', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // =================================================================
  // 1. PRODUCTION BUILD & ARTIFACT INTEGRITY
  // =================================================================
  describe('1. Production Build & Configuration Files Verification', () => {
    it('npm run build runs scripts/build.js successfully without errors (exit code 0)', () => {
      const output = execSync('node scripts/build.js', { cwd: rootDir, encoding: 'utf8' });
      assert.ok(output.includes('[BUILD SUCCESS]'));
    });

    it('Dockerfile exists, uses non-root user, and defines container healthcheck', () => {
      const dockerfilePath = path.join(rootDir, 'Dockerfile');
      assert.ok(fs.existsSync(dockerfilePath));
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      assert.ok(content.includes('USER node'));
      assert.ok(content.includes('HEALTHCHECK'));
      assert.ok(content.includes('EXPOSE 3000'));
      assert.ok(content.includes('scripts/dev-server.js'));
    });

    it('.dockerignore exists and explicitly ignores .env, .git, and secrets', () => {
      const ignorePath = path.join(rootDir, '.dockerignore');
      assert.ok(fs.existsSync(ignorePath));
      const content = fs.readFileSync(ignorePath, 'utf8');
      assert.ok(content.includes('.env'));
      assert.ok(content.includes('.git'));
    });

    it('docker-compose.yml exists and configures container with restart policy and port 3000', () => {
      const composePath = path.join(rootDir, 'docker-compose.yml');
      assert.ok(fs.existsSync(composePath));
      const content = fs.readFileSync(composePath, 'utf8');
      assert.ok(content.includes('3000:3000'));
      assert.ok(content.includes('unless-stopped'));
    });

    it('Procfile exists and defines web process entrypoint', () => {
      const procPath = path.join(rootDir, 'Procfile');
      assert.ok(fs.existsSync(procPath));
      const content = fs.readFileSync(procPath, 'utf8');
      assert.ok(content.includes('web: node scripts/dev-server.js'));
    });

    it('DEPLOYMENT.md exists and contains comprehensive smoke test and rollback guides', () => {
      const deployDoc = path.join(rootDir, 'DEPLOYMENT.md');
      assert.ok(fs.existsSync(deployDoc));
      const content = fs.readFileSync(deployDoc, 'utf8');
      assert.ok(content.includes('Post-Deployment Smoke Test Sequence'));
      assert.ok(content.includes('Rollback & Disaster Recovery Procedures'));
    });
  });

  // =================================================================
  // 2. PRODUCTION HEALTH CHECK & SECURITY HEADERS
  // =================================================================
  describe('2. Production Health Check & Security Headers', () => {
    it('GET /api/v1/health responds with HTTP 200 and healthy status without credential leakage', async () => {
      const res = await request('GET', '/api/v1/health');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.status, 'UP');
      assert.ok(res.data.timestamp);

      // Verify zero sensitive leaks
      const str = JSON.stringify(res.data);
      assert.ok(!str.includes('password'));
      assert.ok(!str.includes('secret'));
      assert.ok(!str.includes('DATABASE_URL'));
    });

    it('Static asset delivery returns strict security headers (CSP, nosniff, DENY)', async () => {
      const res = await request('GET', '/index.html');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['x-content-type-options']);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.ok(res.headers['x-frame-options']);
      assert.equal(res.headers['x-frame-options'], 'DENY');
      assert.ok(res.headers['content-security-policy']);
    });
  });

  // =================================================================
  // 3. POST-DEPLOYMENT PRODUCTION SMOKE TEST
  // =================================================================
  describe('3. Automated Post-Deployment Smoke Test Sequence', () => {
    let citizenToken = '';
    let officerToken = '';
    let adminToken = '';
    let smokeAppId = '';

    it('Citizen Registration & Authentication Smoke Test', async () => {
      const regRes = await request('POST', '/api/v1/auth/register', {
        name: 'Deployment Smoke Citizen',
        email: `smoke_cit_${Date.now()}@gov.test`,
        password: 'Password@2026',
        phone: '+91 98888 77777',
        state: 'Maharashtra',
        district: 'Pune'
      });
      assert.equal(regRes.statusCode, 201);
      citizenToken = regRes.data.token;
      assert.ok(citizenToken);
    });

    it('Service Catalog Discovery Smoke Test', async () => {
      const srvRes = await request('GET', '/api/v1/services');
      assert.equal(srvRes.statusCode, 200);
      assert.ok(srvRes.data.services.length >= 5);
    });

    it('Application Submission & Tracking Smoke Test', async () => {
      const appRes = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001',
        formData: {
          fullName: 'Deployment Smoke Citizen',
          email: 'smoke@gov.test',
          phone: '+91 98888 77777',
          address: '100 Tech Park, Pune',
          district: 'Pune',
          state: 'Maharashtra',
          annualIncome: '240000',
          institution: 'Pune Institute of Technology',
          course: 'B.E. Computer Engineering'
        },
        documents: [
          { name: 'Aadhaar Card', fileName: 'aadhaar_smoke.pdf', fileSize: 2048, status: 'Uploaded' }
        ],
        status: 'SUBMITTED'
      }, {
        'Authorization': `Bearer ${citizenToken}`
      });
      assert.equal(appRes.statusCode, 201);
      smokeAppId = appRes.data.application.id;

      // Verify tracking immediately reflects SUBMITTED
      const trackRes = await request('GET', `/api/v1/applications/${smokeAppId}/tracking`, null, {
        'Authorization': `Bearer ${citizenToken}`
      });
      assert.equal(trackRes.statusCode, 200);
      assert.equal(trackRes.data.tracking.status, 'SUBMITTED');
    });

    it('Department Officer Processing Smoke Test', async () => {
      const loginRes = await request('POST', '/api/v1/auth/login', {
        email: 'officer.edu@gov.in',
        password: 'Officer@123'
      });
      assert.equal(loginRes.statusCode, 200);
      officerToken = loginRes.data.token;

      // Officer claims application
      const claimRes = await request('POST', `/api/v1/officer/applications/${smokeAppId}/claim`, {}, {
        'Authorization': `Bearer ${officerToken}`
      });
      assert.equal(claimRes.statusCode, 200);

      // Officer approves application
      const approveRes = await request('POST', `/api/v1/officer/applications/${smokeAppId}/approve`, {
        decisionRemarks: 'Approved following production deployment smoke test verification.'
      }, {
        'Authorization': `Bearer ${officerToken}`
      });
      assert.equal(approveRes.statusCode, 200);
      assert.equal(approveRes.data.application.status, 'APPROVED');
    });

    it('Administrator Platform Inspection Smoke Test', async () => {
      const adminLogin = await request('POST', '/api/v1/auth/login', {
        email: 'admin@gov.in',
        password: 'Admin@123'
      });
      assert.equal(adminLogin.statusCode, 200);
      adminToken = adminLogin.data.token;

      // Check admin dashboard
      const dashRes = await request('GET', '/api/v1/admin/dashboard', null, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert.equal(dashRes.statusCode, 200);
      assert.ok(dashRes.data.summary);

      // Check platform health check
      const healthRes = await request('GET', '/api/v1/admin/platform-health', null, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert.equal(healthRes.statusCode, 200);
      assert.equal(healthRes.data.status, 'HEALTHY');

      // Check cache performance statistics
      const cacheRes = await request('GET', '/api/v1/admin/cache-stats', null, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert.equal(cacheRes.statusCode, 200);
      assert.ok(cacheRes.data.stats);
    });
  });

  it('Stop production dev server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
