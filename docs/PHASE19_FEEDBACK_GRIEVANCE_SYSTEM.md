# Phase 19 — Feedback & Grievance System

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 19  
**Grievance Service Layer**: [`server/grievances/grievance-service.js`](../server/grievances/grievance-service.js)  
**Database Store & Helpers**: [`server/db.js`](../server/db.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**Frontend UI Component**: [`public/js/components/GrievanceFeedback.js`](../public/js/components/GrievanceFeedback.js)

---

## 1. Overview & Architecture

Phase 19 implements the comprehensive **Feedback & Grievance Redressal System**, enabling citizens to raise statutory complaints regarding public service delays, procedural bottlenecks, or document verification issues, track departmental investigations in real time, and submit star ratings and qualitative reviews for government services:

```text
Citizen
  │
  ├─► Submit Grievance (Category, Dept, Description, Vault Proofs)
  │     ↓
  │   Ticket Registered (Status: SUBMITTED)
  │     ↓
  ├─► Department Officer Workflow (Claim / Assign)
  │     ↓
  │   Under Review (Status: UNDER_REVIEW)
  │     ├── Request Clarification ──► Citizen Responds with Vault Docs (IN_PROGRESS)
  │     ├── Add Internal Notes (Strictly Shielded from Citizen)
  │     ├── Resolve with Documented Reason (Status: RESOLVED)
  │     └── Reject on Statutory Grounds (Status: REJECTED)
  │     ↓
  ├─► Citizen / Officer Closure (Status: CLOSED)
  │
  └─► Service Feedback & Star Rating (1 to 5 Stars + Review)
```

---

## 2. Grievance & Feedback Lifecycle States

### A. Grievance Status Transitions
- `SUBMITTED`: Ticket created by citizen, queued for departmental assignment.
- `ASSIGNED` / `UNDER_REVIEW`: Claimed by an authorized departmental officer for investigation.
- `CLARIFICATION_REQUIRED`: Reviewing officer requested supplementary proofs or clarification from citizen.
- `IN_PROGRESS`: Citizen responded with clarification; active departmental processing resumed.
- `RESOLVED`: Grievance successfully addressed with mandatory `resolutionReason`.
- `REJECTED`: Grievance rejected with statutory grounds documented in `rejectionReason`.
- `CLOSED`: Final administrative closure confirmed by citizen or department.

### B. Configurable Grievance Categories (`GRIEVANCE_CATEGORIES`)
1. **Service Delay**: Turnaround time exceeded for service delivery.
2. **Application Issue**: Difficulty submitting, tracking, or updating an application.
3. **Document Issue**: Problems with document verification, DigiLocker, or vault linking.
4. **Technical Problem**: Portal errors, gateway timeouts, or system glitches.
5. **Officer / Department Issue**: Unresponsive department staff or procedural irregularities.
6. **Payment Issue**: Statutory fee deduction or transaction failure.
7. **Information Request**: Lack of clarity regarding eligibility or required certificates.
8. **Other**: General citizen concerns and miscellaneous issues.

---

## 3. Role-Based Security & Internal Notes Shielding

| Role | Permissions | Security Guardrails |
|---|---|---|
| **Citizen** | Register grievance, view own grievances, view public timeline, respond to clarification, attach vault documents, close resolved grievance, submit feedback. | **Cross-citizen isolation**: Citizen A cannot read or modify Citizen B's tickets.<br>**Internal note shielding**: `internalNotes` are permanently stripped from all citizen responses. |
| **Department Officer** | View grievances for assigned department (`departmentId`), claim/assign tickets, add internal notes, request clarification, resolve, reject. | **Department isolation**: An Education officer cannot view or claim Revenue/Health grievances. |
| **Administrator** | Global visibility across all departments, aggregate analytics, SLA monitoring. | Can inspect all tickets and monitor resolution performance. |

---

## 4. Cross-System Platform Integrations

1. **Phase 13 — Digital Document Vault Integration**:
   - Citizens attach supporting proofs (e.g. fee receipts, affidavits) by selecting documents already stored in their personal Digital Vault (`db.getVaultDocuments(citizenId)`).
   - Verifies document ownership before attachment.
2. **Phase 14 — Notification System Integration**:
   - Dispatches safe, non-blocking in-app notifications to citizens on key lifecycle events:
     - `GRIEVANCE_SUBMITTED`
     - `GRIEVANCE_ASSIGNED`
     - `CLARIFICATION_REQUESTED`
     - `GRIEVANCE_RESOLVED`
     - `GRIEVANCE_REJECTED`
   - Built with fail-safe boundaries so notification issues never interrupt core grievance processing.
3. **Phase 12 — Application Tracking Integration**:
   - Grievance records maintain optional references to `applicationId` (e.g. `APP-2026-EDU-8812`) and `serviceId`, allowing departmental investigators to cross-reference application data.
4. **Audit Logging**:
   - Records auditable events in vault/platform audit trail: `GRIEVANCE_CREATED`, `GRIEVANCE_ASSIGNED`, `GRIEVANCE_INTERNAL_NOTE_ADDED`, `CLARIFICATION_REQUESTED`, `CLARIFICATION_SUBMITTED`, `GRIEVANCE_RESOLVED`, `GRIEVANCE_REJECTED`, `GRIEVANCE_CLOSED`, and `FEEDBACK_SUBMITTED`.

---

## 5. API Gateway Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/grievances` | `CITIZEN` | Registers a new grievance |
| `GET` | `/api/v1/grievances` | `ALL` (RBAC) | Lists grievances (Citizens see own; Officers see department; Admin sees all) |
| `GET` | `/api/v1/grievances/categories` | Public | Returns list of configured categories |
| `GET` | `/api/v1/grievances/analytics` | `ADMIN` | Aggregated resolution and feedback analytics |
| `GET` | `/api/v1/grievances/:id` | `ALL` (RBAC) | Detailed grievance view (shielded for citizens) |
| `POST` | `/api/v1/grievances/:id/claim` | `OFFICER`, `ADMIN` | Officer claims grievance for investigation |
| `POST` | `/api/v1/grievances/:id/notes` | `OFFICER`, `ADMIN` | Officer records an internal investigation note |
| `POST` | `/api/v1/grievances/:id/clarification` | `OFFICER`, `ADMIN` | Officer requests additional citizen proof |
| `POST` | `/api/v1/grievances/:id/respond` | `CITIZEN` | Citizen submits response with optional vault docs |
| `POST` | `/api/v1/grievances/:id/resolve` | `OFFICER`, `ADMIN` | Resolves grievance with mandatory reason |
| `POST` | `/api/v1/grievances/:id/reject` | `OFFICER`, `ADMIN` | Rejects grievance with mandatory reason |
| `POST` | `/api/v1/grievances/:id/close` | `CITIZEN`, `OFFICER`, `ADMIN` | Closes resolved/rejected grievance |
| `GET` | `/api/v1/grievances/:id/timeline` | `ALL` (RBAC) | Chronological audit trail of ticket events |
| `POST` | `/api/v1/feedback` | `CITIZEN` | Submits 1-5 star service/application feedback |
| `GET` | `/api/v1/feedback` | `ALL` (RBAC) | Lists citizen feedback records |

---

## 6. Verification & Automated Testing

Verified via [`tests/grievances.test.js`](../tests/grievances.test.js) (27 tests):
1. **Configurable Categories**: Returns system categories with descriptions.
2. **Citizen Validation**: Enforces mandatory department, subject length (>=5 chars), and description length (>=15 chars).
3. **Vault Integration**: Attaches verified documents from Phase 13 Document Vault.
4. **RBAC & Isolation**: Cross-citizen access blocked (HTTP 403); cross-department access blocked (HTTP 403).
5. **Internal Note Shielding**: Officer notes are visible to departmental officers but stripped from citizen views.
6. **Full Resolution Cycle**: `SUBMITTED` -> `UNDER_REVIEW` -> `CLARIFICATION_REQUIRED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`.
7. **Rejection Cycle**: Revenue department rejection with statutory legal grounds.
8. **Feedback System**: Validates ratings (1-5), checks duplicates, persists feedback.
9. **Admin Analytics**: Computes total grievances, resolution averages, department distributions, and feedback summary.
10. **UI Component**: Renders overview metrics, grievance table, and statutory SLA guide.
