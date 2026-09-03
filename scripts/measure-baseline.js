/**
 * SIH Government Service Integration Platform — Phase 23 Baseline Performance Measurement Script
 * Measures startup time, asset sizes, memory footprint, and API endpoint latencies.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './dev-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runBenchmark() {
  console.log('=== PHASE 23 PERFORMANCE BASELINE BENCHMARK ===\n');

  // 1. Static Asset File Sizes
  console.log('--- 1. STATIC ASSET & BUNDLE SIZES ---');
  const assets = [
    'public/index.html',
    'public/css/style.css',
    'public/js/app.js',
    'public/js/store.js',
    'public/js/components/GovernmentServices.js',
    'public/js/components/ApplicationWorkflow.js',
    'public/js/components/ApplicationTracking.js',
    'public/js/components/DocumentVault.js',
    'public/js/components/AIChatbot.js',
    'public/js/components/EmploymentHub.js',
    'public/js/components/ContentHub.js',
    'public/js/components/PersonalizedDashboard.js',
    'public/js/components/GrievanceRedressal.js',
    'public/js/components/AdminDashboard.js'
  ];

  let totalSize = 0;
  for (const rel of assets) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) {
      const stat = fs.statSync(full);
      totalSize += stat.size;
      console.log(`  ${rel.padEnd(45)}: ${(stat.size / 1024).toFixed(2)} KB`);
    }
  }
  console.log(`  Total Core Assets Size                     : ${(totalSize / 1024).toFixed(2)} KB\n`);

  // 2. Server Startup Time
  console.log('--- 2. APPLICATION STARTUP TIME ---');
  const tStart = performance.now();
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const startupDuration = performance.now() - tStart;
  const port = server.address().port;
  console.log(`  Server Port Bound                          : ${port}`);
  console.log(`  Server Startup Latency                     : ${startupDuration.toFixed(2)} ms\n`);

  // 3. Memory Footprint
  console.log('--- 3. MEMORY FOOTPRINT (POST-STARTUP) ---');
  const mem = process.memoryUsage();
  console.log(`  RSS Memory                                 : ${(mem.rss / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Heap Total                                 : ${(mem.heapTotal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Heap Used                                  : ${(mem.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  External (C++ bindings / Buffers)          : ${(mem.external / (1024 * 1024)).toFixed(2)} MB\n`);

  // Helper for HTTP requests
  const request = (method, pathUrl, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const reqHeaders = { ...headers };
      let payload = null;
      if (body) {
        payload = typeof body === 'string' ? body : JSON.stringify(body);
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
        if (!reqHeaders['Content-Length']) reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const tReq = performance.now();
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
          const latency = performance.now() - tReq;
          resolve({
            statusCode: res.statusCode,
            latency,
            sizeBytes: Buffer.byteLength(data),
            body: data
          });
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  // 4. Authenticate Test Users for Protected Endpoints
  const adminLogin = await request('POST', '/api/v1/auth/login', {
    email: 'admin@gov.in',
    password: 'Admin@123'
  });
  const adminToken = JSON.parse(adminLogin.body).token;

  const citLogin = await request('POST', '/api/v1/auth/register', {
    name: 'Bench Citizen',
    email: `bench_${Date.now()}@gov.test`,
    password: 'Password@2026',
    phone: '+91 99000 11223',
    state: 'Delhi',
    district: 'New Delhi'
  });
  const citizenToken = JSON.parse(citLogin.body).token;

  // 5. Benchmark Core Endpoints (50 iterations each)
  console.log('--- 4. CORE API ENDPOINT LATENCIES (50 ITERATIONS) ---');
  const benchmarkEndpoints = [
    { name: 'Health Check', path: '/api/v1/health', method: 'GET', auth: null },
    { name: 'Service Catalog', path: '/api/v1/services', method: 'GET', auth: null },
    { name: 'Service Categories', path: '/api/v1/categories', method: 'GET', auth: null },
    { name: 'Government Schemes', path: '/api/v1/schemes', method: 'GET', auth: null },
    { name: 'News & Announcements', path: '/api/v1/news', method: 'GET', auth: null },
    { name: 'Employment Opportunities', path: '/api/v1/employment/opportunities', method: 'GET', auth: null },
    { name: 'Citizen Applications List', path: '/api/v1/applications', method: 'GET', auth: citizenToken },
    { name: 'Citizen Vault Documents', path: '/api/v1/vault/documents', method: 'GET', auth: citizenToken },
    { name: 'Admin Dashboard Summary', path: '/api/v1/admin/dashboard', method: 'GET', auth: adminToken },
    { name: 'Admin Platform Health', path: '/api/v1/admin/platform-health', method: 'GET', auth: adminToken }
  ];

  const results = {};
  const ITERATIONS = 50;

  for (const ep of benchmarkEndpoints) {
    const latencies = [];
    let totalBytes = 0;
    const headers = ep.auth ? { 'Authorization': `Bearer ${ep.auth}` } : {};

    for (let i = 0; i < ITERATIONS; i++) {
      const res = await request(ep.method, ep.path, null, headers);
      latencies.push(res.latency);
      totalBytes = res.sizeBytes;
    }

    latencies.sort((a, b) => a - b);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const avg = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    results[ep.name] = { min, avg, p95, max, totalBytes };
    console.log(`  ${ep.name.padEnd(28)} | Avg: ${avg.toFixed(2).padStart(5)}ms | Min: ${min.toFixed(2).padStart(5)}ms | P95: ${p95.toFixed(2).padStart(5)}ms | Max: ${max.toFixed(2).padStart(5)}ms | Size: ${(totalBytes / 1024).toFixed(2)} KB`);
  }

  await new Promise(resolve => server.close(resolve));
  console.log('\n=== BASELINE MEASUREMENT COMPLETED SUCCESSFULLY ===');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
