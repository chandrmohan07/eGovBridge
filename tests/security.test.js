import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../scripts/dev-server.js';
import { escapeHtml, sanitizeInput, sanitizeLogData, isSafePath } from '../server/security/index.js';

describe('Phase 21 — Comprehensive Security Hardening & Audit Verification', () => {
  let server;
  let port;

  let citizen1Token = '';
  let citizen2Token = '';
  let eduOfficerToken = '';
  let revOfficerToken = '';
  let adminToken = '';

  let cit1VaultDocId = '';
  let cit1AppId = '';

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

  it('Start dev server with Phase 21 Hardened Security & Gateway Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // =================================================================
  // 1. AUTHENTICATION HARDENING
  // =================================================================
  it('Setup: Authenticate Citizen 1, Citizen 2, Officers, and Admin', async () => {
    // 1. Citizen 1 Registration
    const c1 = await request('POST', '/api/v1/auth/register', {
      name: 'Priya Sharma',
      email: `priya_sec_${Date.now()}@gov.test`,
      password: 'SecurePassword@2026',
      phone: '+91 99887 11223',
      state: 'Delhi',
      district: 'New Delhi'
    });
    assert.equal(c1.statusCode, 201);
    citizen1Token = c1.data.token;

    // 2. Citizen 2 Registration
    const c2 = await request('POST', '/api/v1/auth/register', {
      name: 'Vikram Mehta',
      email: `vikram_sec_${Date.now()}@gov.test`,
      password: 'SecurePassword@2026',
      phone: '+91 99887 44556',
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

    // 5. Administrator Login
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;
  });

  it('Reject login with missing fields (HTTP 400)', async () => {
    const res = await request('POST', '/api/v1/auth/login', { email: '' });
    assert.equal(res.statusCode, 400);
  });

  it('Reject login with wrong password (HTTP 401)', async () => {
    const res = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'WrongPassword@999'
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
  });

  it('Reject login with non-existent user account (HTTP 401)', async () => {
    const res = await request('POST', '/api/v1/auth/login', {
      email: 'hacker_ghost@notfound.test',
      password: 'FakePassword@123'
    });
    assert.equal(res.statusCode, 401);
  });

  it('User authentication responses strictly strip password hashes and salts', async () => {
    const res = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.equal(res.data.user.salt, undefined);
  });

  it('Logout invalidates session token; subsequent request returns HTTP 401', async () => {
    // 1. Temporary login to test logout
    const tempLogin = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    const tempToken = tempLogin.data.token;

    // 2. Perform logout
    const logoutRes = await request('POST', '/api/v1/auth/logout', {}, {
      'Authorization': `Bearer ${tempToken}`
    });
    assert.equal(logoutRes.statusCode, 200);

    // 3. Attempt to use invalidated token
    const afterLogout = await request('GET', '/api/v1/officer/applications', null, {
      'Authorization': `Bearer ${tempToken}`
    });
    assert.equal(afterLogout.statusCode, 401);
  });

  it('Tampered or forged Bearer token is rejected with HTTP 401', async () => {
    const res = await request('GET', '/api/v1/applications', null, {
      'Authorization': 'Bearer fake_tampered_jwt_token_12345'
    });
    assert.equal(res.statusCode, 401);
  });

  // =================================================================
  // 2. RBAC & PRIVILEGE ESCALATION PROTECTION
  // =================================================================
  it('Citizen CANNOT access Admin executive dashboard (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  it('Officer CANNOT access Admin executive dashboard (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/admin/dashboard', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Citizen CANNOT access Admin audit logs (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/admin/audit-logs', null, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Officer CANNOT access Admin audit logs (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/admin/audit-logs', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('Education Officer CANNOT access Revenue application detail (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', '/api/v1/officer/applications/APP-2026-REV-4109', null, {
      'Authorization': `Bearer ${eduOfficerToken}`
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.data.success, false);
  });

  // =================================================================
  // 3. IDOR (INSECURE DIRECT OBJECT REFERENCE) PROTECTION
  // =================================================================
  it('Setup: Citizen 1 submits an application and uploads a Vault document', async () => {
    // 1. Submit application
    const appRes = await request('POST', '/api/v1/applications', {
      serviceId: 'SRV-EDU-001',
      formData: {
        fullName: 'Priya Sharma',
        email: 'priya_sec@gov.test',
        phone: '+91 99887 11223',
        address: '123 New Delhi',
        institution: 'Delhi University'
      },
      documents: [],
      status: 'DRAFT'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(appRes.statusCode, 201);
    cit1AppId = appRes.data.application.id;

    // 2. Upload vault document
    const docRes = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Aadhaar Identity Card',
      fileName: 'aadhaar_card.pdf',
      fileData: Buffer.from('%PDF-1.4 Mock Aadhaar Content').toString('base64'),
      mimeType: 'application/pdf'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(docRes.statusCode, 201);
    cit1VaultDocId = docRes.data.document.id;
  });

  it('IDOR: Citizen 2 CANNOT access Citizen 1 application tracking (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/applications/${cit1AppId}/tracking`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('IDOR: Citizen 2 CANNOT access Citizen 1 vault document metadata (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/vault/documents/${cit1VaultDocId}`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('IDOR: Citizen 2 CANNOT download Citizen 1 vault document binary (HTTP 403 Forbidden)', async () => {
    const res = await request('GET', `/api/v1/vault/documents/${cit1VaultDocId}/download`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  it('IDOR: Citizen 2 CANNOT delete Citizen 1 vault document (HTTP 403 Forbidden)', async () => {
    const res = await request('DELETE', `/api/v1/vault/documents/${cit1VaultDocId}`, null, {
      'Authorization': `Bearer ${citizen2Token}`
    });
    assert.equal(res.statusCode, 403);
  });

  // =================================================================
  // 4. XSS & INPUT SANITIZATION
  // =================================================================
  it('escapeHtml correctly escapes malicious script injection characters', () => {
    const malicious = '<script>alert("XSS")</script>';
    const escaped = escapeHtml(malicious);
    assert.equal(escaped, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    assert.ok(!escaped.includes('<script>'));
  });

  it('sanitizeInput recursively cleans objects and strips control characters', () => {
    const payload = {
      comment: 'Safe comment \x00 with null bytes <script>',
      nested: {
        title: 'Title <img src=x onerror=alert(1)>'
      }
    };
    const cleaned = sanitizeInput(payload);
    assert.ok(!cleaned.comment.includes('\x00'));
    assert.ok(!cleaned.comment.includes('<script>'));
    assert.ok(!cleaned.nested.title.includes('<img'));
  });

  // =================================================================
  // 5. FILE UPLOAD & PATH TRAVERSAL DEFENSE
  // =================================================================
  it('Vault storage rejects insecure file extensions (.exe, .sh, .bat) (HTTP 400)', async () => {
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Malicious Executable',
      fileName: 'trojan_installer.exe',
      fileData: Buffer.from('malicious binary').toString('base64'),
      mimeType: 'application/octet-stream'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 400);
  });

  it('Vault storage rejects oversized files exceeding 5 MB limit (HTTP 400)', async () => {
    const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
    const res = await request('POST', '/api/v1/vault/documents', {
      documentType: 'IDENTITY_PROOF',
      documentName: 'Giant Payload',
      fileName: 'oversized_scan.pdf',
      fileData: bigBuffer.toString('base64'),
      mimeType: 'application/pdf'
    }, {
      'Authorization': `Bearer ${citizen1Token}`
    });
    assert.equal(res.statusCode, 400);
  });

  it('isSafePath correctly flags directory traversal attempts', () => {
    assert.equal(isSafePath('/app/public/index.html', '/app/public'), true);
    assert.equal(isSafePath('/app/etc/passwd', '/app/public'), false);
    assert.equal(isSafePath('../../windows/system32', '/app/public'), false);
  });

  // =================================================================
  // 6. COMPREHENSIVE SECURITY HEADERS
  // =================================================================
  it('API Gateway responses include all required security headers', async () => {
    const res = await request('GET', '/api/v1/health');
    assert.equal(res.statusCode, 200);

    // Verify critical headers
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.ok(res.headers['permissions-policy']);
    assert.ok(res.headers['content-security-policy']);
    assert.ok(res.headers['strict-transport-security']);
    assert.ok(res.headers['x-request-id']);
  });

  // =================================================================
  // 7. RATE LIMITING PROTECTION
  // =================================================================
  it('API Gateway enforces rate limiting when request limit is exceeded (HTTP 429)', async () => {
    const res = await request('GET', '/api/v1/health', null, {
      'X-Test-Rate-Limit': '0' // Force rate limit trigger
    });
    assert.equal(res.statusCode, 429);
    assert.equal(res.data.success, false);
    assert.ok(res.headers['retry-after']);
  });

  // =================================================================
  // 8. ZERO-LEAKAGE ERROR RESPONSES
  // =================================================================
  it('Errors do NOT leak stack traces, database internals, or server paths', async () => {
    const res = await request('GET', '/api/v1/non_existent_route');
    assert.equal(res.statusCode, 404);
    assert.equal(res.data.stack, undefined);
    assert.equal(res.data.sql, undefined);
    assert.equal(res.data.path, undefined);
  });

  // =================================================================
  // 9. PLATFORM AUDIT TRAIL & DATA REDACTION
  // =================================================================
  it('Admin retrieves centralized audit logs (GET /api/v1/admin/audit-logs)', async () => {
    const res = await request('GET', '/api/v1/admin/audit-logs', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.count >= 1);
    assert.ok(Array.isArray(res.data.logs));

    // Confirm presence of standardized audit events
    const eventTypes = res.data.logs.map(l => l.eventType);
    assert.ok(eventTypes.includes('LOGIN') || eventTypes.includes('ACCESS_DENIED'));
  });

  it('sanitizeLogData strictly redacts passwords, tokens, and sensitive keys', () => {
    const dirty = {
      password: 'RealSecretPassword@123',
      token: 'jwt_secret_token_value',
      userEmail: 'admin@gov.in',
      aadhaarNumber: '1234-5678-9012'
    };
    const cleaned = sanitizeLogData(dirty);
    assert.equal(cleaned.password, '[REDACTED]');
    assert.equal(cleaned.token, '[REDACTED]');
    assert.equal(cleaned.aadhaarNumber, '[REDACTED]');
    assert.equal(cleaned.userEmail, 'admin@gov.in');
  });

  // =================================================================
  // 10. REPOSITORY ZERO-SECRET AUDIT
  // =================================================================
  it('Verify repository contains NO hardcoded active secrets or private keys', () => {
    const filesToAudit = [
      'server/auth.js',
      'server/db.js',
      'server/gateway.js',
      'config/external-apis.json',
      'config/external-urls.json',
      '.env.example'
    ];

    const forbiddenPatterns = [
      /BEGIN RSA PRIVATE KEY/,
      /BEGIN PRIVATE KEY/,
      /AKIA[0-9A-Z]{16}/, // AWS access key pattern
      /AIza[0-9A-Za-z-_]{35}/ // Google API key pattern
    ];

    for (const relPath of filesToAudit) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of forbiddenPatterns) {
          assert.equal(pattern.test(content), false, `Forbidden secret pattern detected in ${relPath}`);
        }
      }
    }
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
