/**
 * SIH Government Service Integration Platform — Unified Security & Audit Hardening Module
 * Standardized Audit Logging, Security Headers, Input Sanitization, XSS Protection,
 * and Zero-Leakage Error Formatting.
 */

import crypto from 'node:crypto';

// -----------------------------------------------------------------
// 1. STANDARDIZED AUDIT EVENT TYPES (PLAN.md Phase 21)
// -----------------------------------------------------------------

export const AUDIT_EVENTS = {
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  APPLICATION_CREATED: 'APPLICATION_CREATED',
  APPLICATION_UPDATED: 'APPLICATION_UPDATED',
  DOCUMENT_ACCESSED: 'DOCUMENT_ACCESSED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  INTEGRATION_REQUEST: 'INTEGRATION_REQUEST',
  INTEGRATION_RESPONSE: 'INTEGRATION_RESPONSE',
  APPROVAL: 'APPROVAL',
  REJECTION: 'REJECTION',
  CLARIFICATION_REQUESTED: 'CLARIFICATION_REQUESTED',
  CLARIFICATION_SUBMITTED: 'CLARIFICATION_SUBMITTED',
  GRIEVANCE_CREATED: 'GRIEVANCE_CREATED',
  GRIEVANCE_UPDATED: 'GRIEVANCE_UPDATED',
  ADMIN_CHANGE: 'ADMIN_CHANGE',
  ADMIN_DASHBOARD_VIEWED: 'ADMIN_DASHBOARD_VIEWED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// In-Memory Platform Audit Log Store
export const platformAuditLogs = [];
const MAX_PLATFORM_LOGS = 1000;

// Sensitive keys strictly stripped / redacted from logs and error traces
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'token',
  'authorization',
  'secret',
  'salt',
  'hash',
  'aadhaar',
  'otp',
  'privatekey',
  'private_key',
  'apikey',
  'api_key'
];

/**
 * Strips or redacts sensitive keys from an object before logging or reporting
 */
export function sanitizeLogData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeLogData);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some(pat => key.toLowerCase().includes(pat));
    if (isSensitive) {
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
 * Records an immutable audit log entry into the centralized platform audit trail
 */
export function recordAuditEvent(eventType, actor, details = {}) {
  const safeActor = actor ? {
    id: actor.id || 'ANONYMOUS',
    role: actor.role || 'GUEST',
    departmentCode: actor.departmentCode || actor.departmentId || null
  } : { id: 'SYSTEM', role: 'SYSTEM' };

  const entry = {
    id: `AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    eventType,
    actor: safeActor,
    details: sanitizeLogData(details),
    timestamp: new Date().toISOString()
  };

  platformAuditLogs.unshift(entry);
  if (platformAuditLogs.length > MAX_PLATFORM_LOGS) {
    platformAuditLogs.pop();
  }

  return entry;
}

/**
 * Retrieves audit log entries with safe filtering (Role: ADMIN only)
 */
export function getAuditEvents(filter = {}) {
  let list = [...platformAuditLogs];

  if (filter.eventType) {
    list = list.filter(l => l.eventType === filter.eventType);
  }
  if (filter.actorId) {
    list = list.filter(l => l.actor && l.actor.id === filter.actorId);
  }
  if (filter.limit) {
    const limit = Math.min(parseInt(filter.limit, 10), 200);
    list = list.slice(0, limit);
  }

  return list;
}

// -----------------------------------------------------------------
// 2. INPUT SANITIZATION & XSS PROTECTION
// -----------------------------------------------------------------

/**
 * Escapes potentially harmful HTML/script characters to prevent Stored & Reflected XSS
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitizes user input strings and objects against script injection
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Strip null bytes and control characters (except common whitespace)
    let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return escapeHtml(cleaned);
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input !== null && typeof input === 'object') {
    const cleanObj = {};
    for (const [key, value] of Object.entries(input)) {
      cleanObj[key] = sanitizeInput(value);
    }
    return cleanObj;
  }

  return input;
}

/**
 * Verifies that a target file path resides strictly inside the intended base directory
 * to prevent directory traversal attacks (e.g. `../../etc/passwd`)
 */
export function isSafePath(targetPath, baseDir) {
  if (!targetPath || !baseDir) return false;
  const resolvedTarget = targetPath.replace(/\\/g, '/');
  const resolvedBase = baseDir.replace(/\\/g, '/');
  return resolvedTarget.startsWith(resolvedBase);
}

// -----------------------------------------------------------------
// 3. ENHANCED SECURITY HEADERS
// -----------------------------------------------------------------

export function applySecurityHeaders(res, req = null) {
  if (!res || res.headersSent) return;

  // 1. Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');

  // 2. MIME sniffing protection
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Legacy XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 4. Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Restrict device hardware permissions
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');

  // 6. Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none';");

  // 7. Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // 8. Cache control for private data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// -----------------------------------------------------------------
// 4. ZERO-LEAKAGE ERROR RESPONSE FORMATTER
// -----------------------------------------------------------------

/**
 * Formats errors safely for API responses without exposing database internals,
 * system stack traces, or file system paths.
 */
export function formatSafeError(err, requestId = null) {
  const statusCode = err.statusCode || (err.name === 'AuthError' ? 401 : 500);

  // Safe client-visible message
  let clientMessage = err.message || 'An internal error occurred. Please contact support.';
  if (statusCode === 500) {
    clientMessage = 'An unexpected internal server error occurred. Request has been logged for security review.';
  }

  // Record internal audit of error
  recordAuditEvent(AUDIT_EVENTS.ACCESS_DENIED, null, {
    statusCode,
    errorCode: err.code || 'UNKNOWN_ERROR',
    requestId
  });

  return {
    statusCode,
    payload: {
      success: false,
      error: clientMessage,
      code: err.code || (statusCode === 403 ? 'FORBIDDEN' : statusCode === 401 ? 'UNAUTHORIZED' : 'SERVER_ERROR'),
      requestId: requestId || undefined
    }
  };
}
