import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { 
  rateLimitStore, 
  resetRateLimits, 
  configureRateLimit, 
  sanitizeLogData, 
  gatewayLogs 
} from '../server/gateway.js';

describe('Phase 7 — API Gateway Layer Verification', () => {
  let server;
  let port;

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

  it('Start dev server with API Gateway layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  // 1. Gateway Health & Operational Endpoints
  describe('Gateway Health & Status Endpoints', () => {
    it('GET /api/v1/health returns HTTP 200 with operational status and requestId', async () => {
      const res = await request('GET', '/api/v1/health');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.status, 'UP');
      assert.ok(res.data.timestamp);
      assert.ok(res.data.requestId);
      assert.ok(res.headers['x-request-id']);
      assert.equal(res.data.requestId, res.headers['x-request-id']);
    });

    it('GET /api/v1/gateway/status returns operational metrics and active route inventory', async () => {
      const res = await request('GET', '/api/v1/gateway/status');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.gateway.status, 'OPERATIONAL');
      assert.ok(Array.isArray(res.data.gateway.routes));
      assert.ok(res.data.gateway.routes.includes('/api/v1/health'));
      assert.ok(res.data.gateway.routes.includes('/api/v1/applications/*'));
      assert.ok(res.data.gateway.routes.includes('/api/v1/orchestrations/*'));
      assert.ok(res.data.gateway.rateLimit);
    });
  });

  // 2. Correlation & Request Tracing
  describe('Correlation & Request ID Tracing', () => {
    it('generates a unique requestId when client does not provide one', async () => {
      const res = await request('GET', '/api/v1/health');
      assert.ok(res.data.requestId.startsWith('req-'));
      assert.equal(res.headers['x-request-id'], res.data.requestId);
    });

    it('preserves and echoes client-provided X-Request-Id', async () => {
      const clientTraceId = `trace-citizen-${Date.now()}-abc`;
      const res = await request('GET', '/api/v1/health', null, {
        'X-Request-Id': clientTraceId
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['x-request-id'], clientTraceId);
      assert.equal(res.data.requestId, clientTraceId);
    });
  });

  // 3. Security Headers & CORS
  describe('Security Headers & CORS Handling', () => {
    it('applies standard security headers to all responses', async () => {
      const res = await request('GET', '/api/v1/health');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'DENY');
      assert.equal(res.headers['x-xss-protection'], '1; mode=block');
      assert.equal(res.headers['access-control-allow-origin'], '*');
    });

    it('handles OPTIONS preflight requests with HTTP 204 and CORS headers', async () => {
      const res = await request('OPTIONS', '/api/v1/services');
      assert.equal(res.statusCode, 204);
      assert.equal(res.headers['access-control-allow-origin'], '*');
      assert.ok(res.headers['access-control-allow-methods'].includes('GET'));
      assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
      assert.ok(res.headers['access-control-allow-headers'].includes('Authorization'));
    });
  });

  // 4. Request Validation
  describe('Request Content-Type & Payload Validation', () => {
    it('rejects POST with non-JSON Content-Type when payload is present (HTTP 415)', async () => {
      const res = await request('POST', '/api/v1/auth/login', 'user=admin&pass=123', {
        'Content-Type': 'text/plain'
      });
      assert.equal(res.statusCode, 415);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Unsupported Media Type'));
      assert.ok(res.data.requestId);
    });

    it('rejects malformed JSON body with HTTP 400 Bad Request', async () => {
      const res = await request('POST', '/api/v1/auth/login', '{ email: bad json', {
        'Content-Type': 'application/json'
      });
      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Malformed JSON'));
      assert.ok(res.data.requestId);
    });

    it('returns controlled HTTP 404 for unmatched gateway route', async () => {
      const res = await request('GET', '/api/v1/nonexistent/route');
      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('API endpoint not found'));
      assert.ok(res.data.requestId);
    });
  });

  // 5. Rate Limiting Protection
  describe('Rate Limiting Protection', () => {
    it('enforces rate limit when threshold is exceeded (HTTP 429)', async () => {
      resetRateLimits();
      const testLimit = 5;

      // Send 5 permitted requests
      for (let i = 0; i < testLimit; i++) {
        const res = await request('GET', '/api/v1/health', null, {
          'X-Test-Rate-Limit': String(testLimit)
        });
        assert.equal(res.statusCode, 200);
      }

      // 6th request must be blocked
      const blockedRes = await request('GET', '/api/v1/health', null, {
        'X-Test-Rate-Limit': String(testLimit)
      });
      assert.equal(blockedRes.statusCode, 429);
      assert.equal(blockedRes.data.success, false);
      assert.ok(blockedRes.data.error.includes('Rate limit exceeded'));
      assert.ok(blockedRes.headers['retry-after']);
      assert.ok(blockedRes.data.requestId);

      // Clean up rate limits
      resetRateLimits();
    });
  });

  // 6. Timeout Protection
  describe('Downstream Timeout Protection', () => {
    it('returns HTTP 504 Gateway Timeout when downstream exceeds timeout SLA', async () => {
      const res = await request('GET', '/api/v1/health', null, {
        'X-Simulate-Timeout': 'true'
      });
      assert.equal(res.statusCode, 504);
      assert.equal(res.data.success, false);
      assert.ok(res.data.error.includes('Gateway Timeout'));
      assert.ok(res.data.requestId);
    });
  });

  // 7. Sensitive Data Scrubbing in Logs
  describe('Audit Logging & Sensitive Data Redaction', () => {
    it('sanitizeLogData replaces passwords, tokens, authorization, and Aadhaar with [REDACTED]', () => {
      const rawPayload = {
        name: 'Citizen Rahul',
        email: 'rahul@example.com',
        password: 'SuperSecretPassword@123',
        token: 'jwt-session-token-secret',
        authorization: 'Bearer secret-bearer-token',
        aadhaarMasked: 'XXXX-XXXX-4819',
        aadhaar: '1234-5678-9012',
        serviceId: 'SRV-EDU-001',
        nested: {
          password: 'another-password',
          amount: 50000
        }
      };

      const sanitized = sanitizeLogData(rawPayload);

      assert.equal(sanitized.name, 'Citizen Rahul');
      assert.equal(sanitized.email, 'rahul@example.com');
      assert.equal(sanitized.serviceId, 'SRV-EDU-001');
      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.token, '[REDACTED]');
      assert.equal(sanitized.authorization, '[REDACTED]');
      assert.equal(sanitized.aadhaar, '[REDACTED]');
      assert.equal(sanitized.aadhaarMasked, '[REDACTED]');
      assert.equal(sanitized.nested.password, '[REDACTED]');
      assert.equal(sanitized.nested.amount, 50000);
    });

    it('records incoming requests in gatewayLogs audit queue', async () => {
      const traceId = `log-trace-${Date.now()}`;
      await request('GET', '/api/v1/health', null, { 'X-Request-Id': traceId });
      assert.ok(gatewayLogs.length > 0);
      const matched = gatewayLogs.find(l => l.requestId === traceId);
      assert.ok(matched);
      assert.equal(matched.method, 'GET');
      assert.equal(matched.pathname, '/api/v1/health');
      assert.ok(typeof matched.durationMs === 'number');
    });
  });

  // 8. End-to-End Tracing Across Gateway -> Applications -> Orchestrations
  describe('End-to-End Tracing via Gateway', () => {
    it('traces a citizen registration, application submission, and orchestration through the Gateway', async () => {
      const customTrace = `gateway-e2e-${Date.now()}`;

      // Register citizen through gateway
      const reg = await request('POST', '/api/v1/auth/register', {
        name: 'Gateway Citizen',
        email: `gateway_cit_${Date.now()}@example.com`,
        password: 'Password@123',
        phone: '+91 98765 77777',
        state: 'Maharashtra',
        district: 'Pune'
      }, { 'X-Request-Id': `${customTrace}-reg` });

      assert.equal(reg.statusCode, 201);
      assert.equal(reg.data.requestId, `${customTrace}-reg`);
      const token = reg.data.token;

      // Submit application through gateway
      const appRes = await request('POST', '/api/v1/applications', {
        serviceId: 'SRV-EDU-001',
        formData: {
          fullName: 'Gateway Citizen',
          email: 'gateway_cit@example.com',
          phone: '+91 98765 77777',
          address: '402 Shivajinagar',
          district: 'Pune',
          state: 'Maharashtra',
          institution: 'Pune University',
          course: 'B.Tech IT',
          annualIncome: '180000',
          previousMarks: '85.0'
        },
        documents: [
          { name: 'Income Certificate', fileName: 'income.pdf', fileSize: 100000, status: 'Uploaded' }
        ],
        status: 'SUBMITTED'
      }, {
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': `${customTrace}-app`
      });

      assert.equal(appRes.statusCode, 201);
      assert.equal(appRes.data.requestId, `${customTrace}-app`);
      const orchId = appRes.data.application.orchestrationId;
      assert.ok(orchId);

      // Fetch orchestration through gateway
      const orchRes = await request('GET', `/api/v1/orchestrations/${orchId}`, null, {
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': `${customTrace}-orch`
      });

      assert.equal(orchRes.statusCode, 200);
      assert.equal(orchRes.data.requestId, `${customTrace}-orch`);
      assert.equal(orchRes.data.orchestration.id, orchId);
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
