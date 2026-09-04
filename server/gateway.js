/**
 * SIH Government Service Integration Platform — API Gateway Layer
 * Central entry point for all API traffic: Security headers, CORS, Request Tracing,
 * Rate Limiting, Timeout Protection, Sanitized Logging, and Downstream Routing.
 */

import crypto from 'node:crypto';
import { applySecurityHeaders, recordAuditEvent, AUDIT_EVENTS } from './security/index.js';
import { db } from './db.js';

// Rate Limiting Configuration (Configurable via process.env or test helper)
export const rateLimitConfig = {
  windowMs: parseInt(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.GATEWAY_RATE_LIMIT_MAX || '120', 10)
};

// In-Memory Rate Limit Store: Map<clientIp, { count, resetTime }>
export const rateLimitStore = new Map();

// In-Memory Audit Logs for Gateway Tracing (Sanitized)
export const gatewayLogs = [];
const MAX_LOG_ENTRIES = 200;

// Sensitive keys to redact in logs
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'aadhaar',
  'aadhaarmasked',
  'salt',
  'hash'
]);

/**
 * Sanitizes an object before logging, replacing secrets with '[REDACTED]'
 */
export function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeLogData);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeLogData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Reset rate limit store (Useful for testing)
 */
export function resetRateLimits() {
  rateLimitStore.clear();
}

/**
 * Configure rate limit thresholds dynamically
 */
export function configureRateLimit(maxRequests, windowMs = 60000) {
  rateLimitConfig.maxRequests = maxRequests;
  rateLimitConfig.windowMs = windowMs;
}

/**
 * Check Rate Limit for Client IP
 */
function checkRateLimit(clientIp, customMax = null) {
  const now = Date.now();
  const max = customMax !== null ? customMax : rateLimitConfig.maxRequests;
  const windowMs = rateLimitConfig.windowMs;

  let record = rateLimitStore.get(clientIp);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitStore.set(clientIp, record);
    return { allowed: true, remaining: max - 1, resetTime: record.resetTime };
  }

  record.count += 1;
  if (record.count > max) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  return { allowed: true, remaining: max - record.count, resetTime: record.resetTime };
}

/**
 * Send Standardized JSON Response via Gateway
 */
export function sendGatewayJson(res, statusCode, payload, requestId) {
  if (res.headersSent) return;

  const data = typeof payload === 'object' && payload !== null ? { ...payload } : { data: payload };
  if (requestId && !data.requestId) {
    data.requestId = requestId;
  }

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Request-Id': requestId || 'req-unknown'
  });
  res.end(JSON.stringify(data));
}

/**
 * Core API Gateway Handler
 */
export async function apiGateway(req, res, downstreamHandler) {
  const startTime = Date.now();

  // 1. Correlation & Request ID Generation
  const incomingReqId = req.headers['x-request-id'];
  const requestId = incomingReqId || `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  req.requestId = requestId;

  // 2. Comprehensive Security & CORS Headers
  applySecurityHeaders(res, req);
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Simulate-Timeout, X-Test-Rate-Limit');

  // 3. Preflight OPTIONS Handling
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();
  const clientIp = req.socket?.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';

  try {
    // 3. Preflight OPTIONS Handling
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 4. Rate Limiting Check
    const customTestLimit = req.headers['x-test-rate-limit'] ? parseInt(req.headers['x-test-rate-limit'], 10) : null;
    const rateLimitResult = checkRateLimit(clientIp, customTestLimit);

    if (!rateLimitResult.allowed) {
      const retrySeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retrySeconds > 0 ? retrySeconds : 1));
      return sendGatewayJson(res, 429, {
        success: false,
        error: `Rate limit exceeded. Maximum ${customTestLimit || rateLimitConfig.maxRequests} requests per window. Please retry after ${retrySeconds} seconds.`
      }, requestId);
    }

    // 5. Timeout Protection & Simulation Check
    const timeoutMs = parseInt(process.env.GATEWAY_TIMEOUT_MS || '10000', 10);
    const simulateTimeout = req.headers['x-simulate-timeout'] === 'true' || url.searchParams.get('simulateTimeout') === 'true';

    if (simulateTimeout) {
      await new Promise(r => setTimeout(r, 40));
      return sendGatewayJson(res, 504, {
        success: false,
        error: 'Gateway Timeout: Downstream service did not respond within configured SLA limit'
      }, requestId);
    }

    // 6. Gateway Health & Status Routes
    if (method === 'GET' && pathname === '/api/v1/health') {
      const isPgConfigured = db.isPostgresConfigured ? db.isPostgresConfigured() : false;
      const isPgConnected = db.isPostgresConnected ? db.isPostgresConnected() : false;
      return sendGatewayJson(res, 200, {
        success: true,
        status: 'UP',
        service: 'Government Integration Platform API Gateway',
        database: {
          configured: isPgConfigured,
          connected: isPgConnected,
          engine: isPgConnected ? 'PostgreSQL 16' : (isPgConfigured ? 'PostgreSQL (Connecting/Retrying)' : 'In-Memory State Store')
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }, requestId);
    }

    if (method === 'GET' && pathname === '/api/v1/gateway/status') {
      return sendGatewayJson(res, 200, {
        success: true,
        gateway: {
          version: '1.0.0',
          status: 'OPERATIONAL',
          environment: process.env.NODE_ENV || 'development',
          routes: [
            '/api/v1/health',
            '/api/v1/gateway/status',
            '/api/v1/auth/*',
            '/api/v1/services/*',
            '/api/v1/categories',
            '/api/v1/applications/*',
            '/api/v1/orchestrations/*',
            '/api/v1/officer/*',
            '/api/v1/admin/*'
          ],
          rateLimit: {
            windowMs: rateLimitConfig.windowMs,
            maxRequests: rateLimitConfig.maxRequests,
            activeTrackedIps: rateLimitStore.size
          }
        }
      }, requestId);
    }

    // 7. Content-Type Validation on Mutating Requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      if (contentType && !contentType.includes('application/json')) {
        return sendGatewayJson(res, 415, {
          success: false,
          error: 'Unsupported Media Type: Request body must be Content-Type: application/json'
        }, requestId);
      }
    }

    // 8. Safe Downstream Execution
    let timeoutHandle = null;
    const timeoutPromise = new Promise((resolve) => {
      timeoutHandle = setTimeout(() => {
        resolve({ isTimeout: true });
      }, timeoutMs);
    });

    try {
      const executionPromise = downstreamHandler(req, res);
      const result = await Promise.race([executionPromise, timeoutPromise]);

      if (result && result.isTimeout && !res.headersSent) {
        return sendGatewayJson(res, 504, {
          success: false,
          error: 'Gateway Timeout: Downstream service did not respond within configured SLA limit'
        }, requestId);
      }
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  } catch (err) {
    if (!res.headersSent) {
      const status = err.statusCode || 500;
      return sendGatewayJson(res, status, {
        success: false,
        error: err.message || 'Downstream Internal Service Error'
      }, requestId);
    }
  } finally {
    // 9. Sanitized Request / Response Audit Logging
    const durationMs = Date.now() - startTime;
    const logEntry = {
      requestId,
      method,
      pathname,
      clientIp: clientIp === '::1' ? '127.0.0.1' : clientIp,
      durationMs,
      timestamp: new Date().toISOString()
    };

    gatewayLogs.unshift(logEntry);
    if (gatewayLogs.length > MAX_LOG_ENTRIES) {
      gatewayLogs.pop();
    }
  }
}
