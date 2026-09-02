# Phase 3 — Authentication & Role Management (RBAC)

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 3

---

## 1. Overview

Phase 3 establishes the end-to-end Authentication & Role-Based Access Control (RBAC) foundation for the SIH Government Service Integration Platform. It supports the three core personas: **Citizen**, **Department Officer**, and **Platform Administrator**, backed by server-side route guards, secure password hashing, session management, and strict departmental boundaries.

---

## 2. Role Permissions Matrix

| Permission Key | Description | Citizen | Officer | Admin |
|---|---|:---:|:---:|:---:|
| `services:read` | Browse and search service catalog | ✅ | ✅ | ✅ |
| `applications:create` | Submit unified applications | ✅ | ❌ | ❌ |
| `applications:read_own` | Track citizen's own applications | ✅ | ❌ | ❌ |
| `vault:read_own` | Access citizen's own document vault | ✅ | ❌ | ❌ |
| `ai_help:access` | Grounded AI guidance assistant | ✅ | ✅ | ✅ |
| `officer:workspace` | Access assigned department queue | ❌ | ✅ | ❌ |
| `applications:read_dept` | View applications in assigned department | ❌ | ✅ (Scoped) | ❌ |
| `applications:process_dept`| Verify/update department applications | ❌ | ✅ (Scoped) | ❌ |
| `admin:manage_users` | Manage accounts, roles, and status | ❌ | ❌ | ✅ |
| `admin:manage_departments`| Manage registered departments | ❌ | ❌ | ✅ |
| `admin:system_overview` | System-wide configuration & monitoring | ❌ | ❌ | ✅ |

---

## 3. Cryptographic Security Standards

1. **Password Hashing**:
   - Uses Node.js native `crypto.scryptSync` with a unique 16-byte cryptographically secure random salt per user.
   - Plaintext passwords are never stored in the database or logs.
   - Timing-safe equality checks (`crypto.timingSafeEqual`) prevent timing side-channel attacks.
2. **Server-Side RBAC Enforcement**:
   - Client-side navigation route hiding is backed by server-side verification middleware.
   - Protected API requests must supply `Authorization: Bearer <token>`.
   - Cross-role violations return `HTTP 403 Forbidden` with detailed violation descriptions.
3. **Department Isolation for Officers**:
   - An officer assigned to Department of Higher Education (`EDUCATION`) is blocked by server middleware from querying or modifying applications belonging to State Revenue (`REVENUE`).
4. **Data Sanitization**:
   - `sanitizeUser()` strictly strips `passwordHash` and `salt` before returning user payloads to the frontend or API callers.

---

## 4. Backend REST Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Registers a new Citizen account |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials; returns Bearer session token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes session token |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns current authenticated user profile & permissions |
| `GET` | `/api/v1/officer/workspace` | Officer Only | Scoped applications for officer's assigned department |
| `GET` | `/api/v1/officer/department/:code/applications` | Officer Only | Strict department isolation verification endpoint |
| `GET` | `/api/v1/admin/users` | Admin Only | List of all system users and role assignments |
| `GET` | `/api/v1/admin/departments` | Admin Only | Directory of connected government departments |

---

## 5. Seed Accounts for Demonstration

| Role | Email | Password | Assigned Scope |
|---|---|---|---|
| **Citizen** | `citizen@example.com` | `Citizen@123` | Citizen Gateway (Rahul Verma) |
| **Officer (Education)** | `officer.edu@gov.in` | `Officer@123` | Dept of Higher Education (`EDUCATION`) |
| **Officer (Revenue)** | `officer.rev@gov.in` | `Officer@123` | State Revenue Dept (`REVENUE`) |
| **Administrator** | `admin@gov.in` | `Admin@123` | System-Wide Platform Admin |

---

## 6. Verification Results

Automated test suite [`tests/auth.test.js`](../tests/auth.test.js) passed 10/10 test blocks covering:
- Cryptographic scrypt password hashing & salt randomness
- Password sanitization
- Citizen registration and login validation
- Citizen cross-role block (403 Forbidden)
- Department Officer department isolation (403 Forbidden on foreign department)
- Platform Administrator system-wide management
- Token revocation and post-logout 401 unauthorized rejection
- End-to-end HTTP API request execution with real headers and status codes
