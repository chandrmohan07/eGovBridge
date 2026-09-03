# Phase 7 — API Gateway Layer

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 7

---

## 1. Overview

Phase 7 introduces the **Government Integration Platform API Gateway**, creating a secure, centralized entry point that mediates all incoming client traffic before reaching internal service modules, authentication controllers, database models, or future department adapters.

---

## 2. Target Architecture

```text
Citizen / Officer / Admin Client
               ↓
          API Gateway
               ├── Correlation / Request ID Generation (X-Request-Id)
               ├── Security Headers (HSTS, CSP, nosniff, DENY) & CORS
               ├── Rate Limiting (Sliding Window per IP)
               ├── Request Content-Type & Payload Validation
               ├── Downstream Timeout SLA Protection (504 Gateway Timeout)
               └── Sanitized Audit Logging (Redacting passwords, tokens, Aadhaar)
               ↓
    Authentication & RBAC Layer (Phase 3)
               ↓
    Application & Service Layer (Phases 4 & 5)
               ↓
    Smart Orchestration Engine (Phase 6)
               ↓
    Future Department Adapters (Phase 8)
```

---

## 3. Gateway Core Responsibilities & Modules

Implemented in [`server/gateway.js`](../server/gateway.js):

### 1. Centralized Routing
All `/api/*` requests in [`scripts/dev-server.js`](../scripts/dev-server.js) are routed through `apiGateway(req, res, handleApiRequest)`:
- `GET /api/v1/health`: Gateway liveness and readiness probe.
- `GET /api/v1/gateway/status`: Operational metrics, route inventory, and active tracked IPs.
- `/api/v1/auth/*`: Authentication, registration, login, profile, and session management.
- `/api/v1/services/*`: Government service catalog search and deep-dive metadata.
- `/api/v1/categories`: Canonical service categories.
- `/api/v1/applications/*`: Multi-step applications, drafts, and ownership verification.
- `/api/v1/orchestrations/*`: Inter-department DAG execution plans, stepping, and retries.
- `/api/v1/officer/*`: Department-scoped workspace verification.
- `/api/v1/admin/*`: System-wide user and department governance.

### 2. Request & Correlation ID Tracing
- Inspects incoming `X-Request-Id` header from client. If missing, automatically generates a cryptographically unique identifier: `req-[timestamp]-[randomHex]`.
- Attaches `X-Request-Id` to all outgoing HTTP response headers.
- Emits `requestId` property inside all JSON response payloads, enabling end-to-end tracing across gateway → services → orchestrations.

### 3. Security Headers & CORS Policy
- `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing)
- `X-Frame-Options: DENY` (Clickjacking defense)
- `X-XSS-Protection: 1; mode=block` (Reflected XSS filter)
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-Id`
- Automatic HTTP `204 No Content` handling for preflight `OPTIONS` requests.

### 4. Rate Limiting Protection
- Sliding-window rate limiter per client IP.
- Default threshold: 120 requests per minute (`GATEWAY_RATE_LIMIT_MAX = 120`, `GATEWAY_RATE_LIMIT_WINDOW_MS = 60000`).
- Exceeded limits trigger HTTP `429 Too Many Requests` with a `Retry-After: [seconds]` header and descriptive JSON error.

### 5. Timeout Protection (SLA Enforcer)
- Downstream execution is guarded by an asynchronous race timer (`GATEWAY_TIMEOUT_MS = 10000`).
- If downstream handlers or database operations do not respond within SLA, the gateway cleanly intercepts and emits HTTP `504 Gateway Timeout` without hanging or crashing the server.

### 6. Content-Type & Payload Validation
- Mutating methods (`POST`, `PUT`, `PATCH`) with payload strictly enforce `Content-Type: application/json`. Non-conforming bodies are rejected with HTTP `415 Unsupported Media Type`.
- Malformed JSON payloads are trapped early and returned as HTTP `400 Bad Request`.

### 7. Sanitized Audit Logging
- In-memory circular buffer (`gatewayLogs`) tracks request duration, method, pathname, client IP, and timestamps.
- `sanitizeLogData` scrubs sensitive parameters (`password`, `token`, `authorization`, `secret`, `aadhaar`, `aadhaarMasked`, `salt`, `hash`) to `[REDACTED]` prior to logging.

---

## 4. REST Endpoints Introduced in Gateway

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Gateway health check probe (status: `UP`) |
| `GET` | `/api/v1/gateway/status` | Operational status, active routes, and rate-limit statistics |
| `OPTIONS` | `/api/*` | CORS preflight responder (204 No Content) |

---

## 5. Readiness for Phase 8

The API Gateway is fully decoupled from departmental adapter business logic. In Phase 8 (Department Integration Adapter Layer), downstream adapter calls can be registered seamlessly behind the gateway's routing, timeout, security, and correlation tracking layers.
