# Phase 20 — Admin Dashboard & Analytics

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 20  
**Admin Service Layer**: [`server/admin/admin-service.js`](../server/admin/admin-service.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**Frontend UI Component**: [`public/js/components/AdminDashboard.js`](../public/js/components/AdminDashboard.js)  
**Test Suite**: [`tests/admin.test.js`](../tests/admin.test.js)

---

## 1. Overview & Architecture

Phase 20 delivers a **Centralized Executive Administrative Dashboard and Analytics Engine**, providing platform administrators with real-time operational intelligence, multi-department workload monitoring, service performance analytics, and technical health checks across the complete federated platform:

```text
Admin Token (Role: ADMIN)
  │
  ├─► Executive Overview (Citizens, Officers, Applications, Grievances, Exchanges)
  ├─► Application Analytics (By Status, Department, Service, Timelines)
  ├─► Department Workloads (Applications, Pending Queues, Officers, SLA Rates)
  ├─► Officer Distribution (Assigned Queues, Workload Distribution, Anonymized)
  ├─► Service Performance (Volume, Processing Targets, Feedback ★, Grievance Rates)
  ├─► Smart Orchestration Analytics (Phase 6 DAG Statuses, Bottlenecks)
  ├─► Inter-Department Exchange Analytics (Phase 10 Transfers, Minimization Audits)
  ├─► Platform Technical Health Checks (7 Subsystems: Gateway, DB, Auth, Vault, etc.)
  └─► Aggregated Non-Sensitive Report Export (JSON / CSV Format)
```

---

## 2. Core Operational Metrics

### A. High-Level Summary Cards
- **Total Citizens**: Active registered citizen users.
- **Active Officers**: Authorized review officers across all 5 nodal ministries.
- **Total Departments**: Federated nodal departments (`EDUCATION`, `REVENUE`, `HEALTH`, `TRANSPORT`, `AGRICULTURE`).
- **Total Services**: Configured government statutory services in catalog.
- **Application Flow**: Real-time totals for `Total Applications`, `Pending Review`, `Completed / Issued`, and `Rejected`.
- **Grievance Resolution**: `Active Grievances`, `Resolved Grievances`, and `Average Resolution Hours`.
- **Citizen Satisfaction**: Aggregated citizen feedback rating (★ 1.0 to 5.0).
- **Inter-Department Data Transfers**: Total completed data exchanges between departments.

### B. Department Workload & SLA Compliance
- Breakdown of applications received, pending, completed, and rejected per department.
- Number of active officers assigned to each department queue.
- Active grievance count against each department.
- Estimated SLA compliance rate based on completed vs overdue turnaround targets.

### C. Technical Platform Health (7 Subsystems)
Each core subsystem is actively monitored via `GET /api/v1/admin/platform-health`:
1. **API Gateway (Phase 7)**: Route dispatcher, average latency (1.5ms), rate limiting.
2. **Database & Memory Store**: In-memory canonical data store, collection count, heap usage.
3. **Authentication Authority**: Stateless HMAC-SHA256 token verification, active session map.
4. **Digital Document Vault (Phase 13)**: Secure vault storage, stored files count, AES-256 integrity.
5. **Notification Engine (Phase 14)**: Central in-app notification dispatcher.
6. **Smart DAG Orchestrator (Phase 6)**: Multi-step task execution engine, parallel threads.
7. **Federated Department Adapters (Phase 8)**: Standardized adapters for all 5 departments.

---

## 3. Security & RBAC Guardrails

| Role | Access Level | Enforcement |
|---|---|---|
| **Platform Administrator (`ADMIN`)** | Full access to all dashboard metrics, department workloads, platform health, and report export. | Authenticated via Bearer token and validated server-side by `requireRole(user, ['ADMIN'])`. |
| **Department Officer (`OFFICER`)** | **DENIED (HTTP 403 Forbidden)**. Officers only access their own departmental workflow queue (Phase 11). | Cannot access global analytics or other departments' workload metrics. |
| **Citizen (`CITIZEN`)** | **DENIED (HTTP 403 Forbidden)**. | Blocked from all administrative endpoints. |
| **Anonymous / Unauthenticated** | **DENIED (HTTP 401 Unauthorized)**. | Requires valid Bearer JWT. |

### Data Minimization & Privacy Protection:
- All sensitive credentials (password hashes, salts, phone numbers, auth tokens, private keys) are strictly stripped and excluded from officer workload and citizen analytics.
- Reports export only aggregated counts and summaries.

---

## 4. API Gateway Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | `ADMIN` | Platform overview summary cards and system environment |
| `GET` | `/api/v1/admin/applications/analytics` | `ADMIN` | Application distribution by status, department, and service |
| `GET` | `/api/v1/admin/departments/analytics` | `ADMIN` | Departmental workloads, active officers, and SLA compliance |
| `GET` | `/api/v1/admin/officers/analytics` | `ADMIN` | Anonymized officer workload distribution |
| `GET` | `/api/v1/admin/services/analytics` | `ADMIN` | Service turnaround times, feedback ratings, and grievances |
| `GET` | `/api/v1/admin/workflows/analytics` | `ADMIN` | Phase 6 DAG orchestration metrics and bottlenecks |
| `GET` | `/api/v1/admin/exchanges/analytics` | `ADMIN` | Phase 10 Inter-department data exchange transfer analytics |
| `GET` | `/api/v1/admin/platform-health` | `ADMIN` | Health status of all 7 platform subsystems |
| `GET` | `/api/v1/admin/export` | `ADMIN` | Exports non-sensitive aggregated reports (`SUMMARY`, `DEPARTMENTS`, `SERVICES`, `EXCHANGES`) |

---

## 5. Verification & Automated Testing

Verified via [`tests/admin.test.js`](../tests/admin.test.js) (19 tests):
1. **Authentication & Route Protection**: Unauthenticated access returns HTTP 401; Citizen and Officer access returns HTTP 403 Forbidden across all admin routes.
2. **Dashboard Overview**: Returns correct citizen, officer, department, service, application, grievance, and system environment counts.
3. **Application Analytics**: Validates breakdown by status, department, and service with pagination.
4. **Department Analytics**: Verifies all 5 departments with application counts and SLA rates.
5. **Officer Workloads**: Verifies officer lists with queue sizes; confirms sensitive fields (`passwordHash`, `salt`) are never exposed.
6. **Service Performance**: Validates volume, turnaround targets, and feedback rating aggregates.
7. **Workflow Analytics**: Checks Phase 6 DAG statuses, average tasks, and bottlenecks.
8. **Data Exchange Analytics**: Validates Phase 10 source/target department transfer stats.
9. **Platform Health Overview**: Confirms healthy status for all 7 subsystems.
10. **Report Export**: Validates structured aggregated export.
11. **UI Component Rendering**: Verifies [`public/js/components/AdminDashboard.js`](../public/js/components/AdminDashboard.js).
