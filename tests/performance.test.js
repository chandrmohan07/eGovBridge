import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { cacheSegments, isSafeToCache, paginate, getPlatformCacheStats } from '../server/cache/index.js';

describe('Phase 23 — Performance, Caching & Optimization Verification', () => {
  let server;
  let port;
  let adminToken = '';
  let citizenToken = '';

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

  it('Start dev server with Phase 23 Caching & Optimization Layer', async () => {
    server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    assert.ok(port > 0);
  });

  it('Setup: Authenticate Admin & Citizen', async () => {
    const adm = await request('POST', '/api/v1/auth/login', {
      email: 'admin@gov.in',
      password: 'Admin@123'
    });
    assert.equal(adm.statusCode, 200);
    adminToken = adm.data.token;

    const cit = await request('POST', '/api/v1/auth/login', {
      email: 'officer.edu@gov.in',
      password: 'Officer@123'
    });
    assert.equal(cit.statusCode, 200);
    citizenToken = cit.data.token;
  });

  // =================================================================
  // 1. CACHE SEGMENT UNIT & SECURITY TESTS
  // =================================================================
  describe('1. In-Memory Cache Segment Operations', () => {
    it('sets and retrieves public data with generated weak ETag', () => {
      cacheSegments.CATALOG.clear();
      const payload = { services: ['SRV-1', 'SRV-2'] };
      const { etag } = cacheSegments.CATALOG.set('test-key', payload, 60);

      assert.ok(etag.startsWith('W/"'));
      const cached = cacheSegments.CATALOG.get('test-key');
      assert.ok(cached);
      assert.deepEqual(cached.value, payload);
      assert.equal(cached.etag, etag);
    });

    it('returns null on cache miss or expired TTL', async () => {
      const missing = cacheSegments.CATALOG.get('non-existent-key');
      assert.equal(missing, null);

      // Short TTL test
      cacheSegments.CATALOG.set('short-key', { val: 1 }, 0.05); // 50ms TTL
      await new Promise(r => setTimeout(r, 60));
      const expired = cacheSegments.CATALOG.get('short-key');
      assert.equal(expired, null);
    });

    it('isSafeToCache strictly blocks caching sensitive citizen credentials and tokens', () => {
      assert.equal(isSafeToCache('services_list', {}), true);
      assert.equal(isSafeToCache('news_items', {}), true);
      assert.equal(isSafeToCache('user_session_token_123', {}), false);
      assert.equal(isSafeToCache('auth_bearer_key', {}), false);
      assert.equal(isSafeToCache('citizen_password_hash', {}), false);
      assert.equal(isSafeToCache('applicant_aadhaar_number', {}), false);
    });
  });

  // =================================================================
  // 2. PAGINATION HELPER UNIT TESTS
  // =================================================================
  describe('2. Standardized Pagination Helper', () => {
    const mockItems = Array.from({ length: 45 }, (_, i) => ({ id: `ITEM-${i + 1}` }));

    it('slices items correctly and calculates totalPages, hasNext, hasPrev', () => {
      const page1 = paginate(mockItems, 1, 10);
      assert.equal(page1.items.length, 10);
      assert.equal(page1.items[0].id, 'ITEM-1');
      assert.equal(page1.pagination.total, 45);
      assert.equal(page1.pagination.page, 1);
      assert.equal(page1.pagination.limit, 10);
      assert.equal(page1.pagination.totalPages, 5);
      assert.equal(page1.pagination.hasNext, true);
      assert.equal(page1.pagination.hasPrev, false);

      const page5 = paginate(mockItems, 5, 10);
      assert.equal(page5.items.length, 5);
      assert.equal(page5.items[0].id, 'ITEM-41');
      assert.equal(page5.pagination.hasNext, false);
      assert.equal(page5.pagination.hasPrev, true);
    });

    it('handles out-of-bounds page gracefully without throwing', () => {
      const outOfBounds = paginate(mockItems, 999, 10);
      assert.equal(outOfBounds.items.length, 0);
      assert.equal(outOfBounds.pagination.hasNext, false);
      assert.equal(outOfBounds.pagination.hasPrev, true);
    });

    it('enforces maximum limit cap (max 100 items per page)', () => {
      const capped = paginate(mockItems, 1, 500);
      assert.equal(capped.pagination.limit, 100);
    });
  });

  // =================================================================
  // 3. API CACHING & CONDITIONAL REQUESTS (ETAG / 304)
  // =================================================================
  describe('3. Public API Caching & ETag Verification', () => {
    it('GET /api/v1/services returns X-Cache: MISS on first request and HIT on subsequent request', async () => {
      cacheSegments.CATALOG.clear();

      // Request 1: Cache MISS
      const res1 = await request('GET', '/api/v1/services');
      assert.equal(res1.statusCode, 200);
      assert.equal(res1.headers['x-cache'], 'MISS');
      const etag = res1.headers['etag'];
      assert.ok(etag);

      // Request 2: Cache HIT
      const res2 = await request('GET', '/api/v1/services');
      assert.equal(res2.statusCode, 200);
      assert.equal(res2.headers['x-cache'], 'HIT');
      assert.equal(res2.headers['etag'], etag);

      // Request 3: Conditional request with matching If-None-Match returns HTTP 304
      const res3 = await request('GET', '/api/v1/services', null, {
        'If-None-Match': etag
      });
      assert.equal(res3.statusCode, 304);
    });

    it('GET /api/v1/services supports server-side pagination (?page=1&limit=2)', async () => {
      const res = await request('GET', '/api/v1/services?page=1&limit=2');
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.count, 2);
      assert.equal(res.data.services.length, 2);
      assert.ok(res.data.pagination);
      assert.equal(res.data.pagination.page, 1);
      assert.equal(res.data.pagination.limit, 2);
      assert.ok(res.data.pagination.total >= 5);
      assert.equal(res.data.pagination.hasNext, true);
    });

    it('GET /api/v1/categories utilizes caching and returns X-Cache: HIT', async () => {
      cacheSegments.CATEGORIES.clear();
      const res1 = await request('GET', '/api/v1/categories');
      assert.equal(res1.statusCode, 200);
      assert.equal(res1.headers['x-cache'], 'MISS');

      const res2 = await request('GET', '/api/v1/categories');
      assert.equal(res2.statusCode, 200);
      assert.equal(res2.headers['x-cache'], 'HIT');
    });
  });

  // =================================================================
  // 4. ADMIN CACHE ANALYTICS & CREDIT-EFFICIENCY ENDPOINT
  // =================================================================
  describe('4. Admin Cache Analytics & Monitoring', () => {
    it('Admin retrieves platform cache statistics (GET /api/v1/admin/cache-stats)', async () => {
      const res = await request('GET', '/api/v1/admin/cache-stats', null, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.stats.totalSegments >= 5);
      assert.ok(res.data.stats.overallHits >= 1);
      assert.ok(res.data.stats.overallHitRatio);
      assert.ok(res.data.stats.segments.CATALOG);
    });

    it('Officer CANNOT access admin cache statistics (HTTP 403 Forbidden)', async () => {
      const res = await request('GET', '/api/v1/admin/cache-stats', null, {
        'Authorization': `Bearer ${citizenToken}`
      });
      assert.equal(res.statusCode, 403);
    });
  });

  // =================================================================
  // 5. CORE ENDPOINT LATENCY BENCHMARK
  // =================================================================
  describe('5. High-Throughput Core Latency SLA Verification', () => {
    it('Executes 30 iterations of /health and /services within sub-10ms average latency', async () => {
      const t0 = performance.now();
      for (let i = 0; i < 30; i++) {
        const res = await request('GET', '/api/v1/health');
        assert.equal(res.statusCode, 200);
      }
      const avgHealth = (performance.now() - t0) / 30;
      assert.ok(avgHealth < 10, `Health average latency was ${avgHealth.toFixed(2)}ms (expected < 10ms)`);

      const t1 = performance.now();
      for (let i = 0; i < 30; i++) {
        const res = await request('GET', '/api/v1/services');
        assert.equal(res.statusCode, 200);
      }
      const avgServices = (performance.now() - t1) / 30;
      assert.ok(avgServices < 10, `Services average latency was ${avgServices.toFixed(2)}ms (expected < 10ms)`);
    });
  });

  it('Stop test server', async () => {
    await new Promise(resolve => server.close(resolve));
  });
});
