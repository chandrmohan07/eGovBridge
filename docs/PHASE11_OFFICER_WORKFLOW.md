# Phase 11 — Department Officer Workflow

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 11  
**Backend Module**: [`server/officer/officer-workflow.js`](../server/officer/officer-workflow.js)  
**Frontend UI Component**: [`public/js/components/OfficerWorkflow.js`](../public/js/components/OfficerWorkflow.js)

---

## 1. Overview & Goal

Phase 11 implements the **Department Officer Workflow**, allowing government departmental officers to securely receive, inspect, review, process, request clarification for, approve/reject, and fulfill citizen applications routed to their department.

```text
Citizen Application Submitted
              ↓
Smart Orchestration / Secure Inter-Department Data Exchange (Phases 6 & 10)
              ↓
Department Officer Queue (Scoped strictly by officer's departmentCode)
              ↓
Authorized Department Officer
  ├── 1. Claim Application (Optimistic concurrency protection)
  ├── 2. Start Formal Review & Scrutiny
  ├── 3. Add Internal Processing Notes (Hidden from citizen view)
  ├── 4. Request Citizen Clarification / Additional Documents
  ├── 5. Approve Application (Synchronizes linked Orchestration Task to COMPLETED)
  ├── 6. Reject Application (Requires mandatory reason; marks Orchestration FAILED)
  └── 7. Complete & Issue Digital Certificate / Order
              ↓
Citizen Real-Time Status & Audit Timeline Updates
```

---

## 2. Departmental Access Control & Security Boundaries

- **Server-Side Department Scope**: Department isolation is enforced strictly on the backend via `getRawApplication` and `requireDepartmentScope`. An Education Officer cannot inspect or process a Revenue or Transport application (HTTP 403 Forbidden).
- **Citizen Data Protection**: Citizens calling `GET /api/v1/applications/:id` receive sanitized records with `internalNotes` completely stripped. Internal officer notes remain private to departmental reviewers and administrators.
- **Role Guarding**: Citizens attempting to access officer queues or action endpoints receive HTTP 403 Forbidden.

---

## 3. Concurrency & Workflow Management

- **Optimistic Concurrency Control**: The application model tracks an incremental `version` counter. When an officer claims or updates an application with `expectedVersion`, a mismatched version immediately raises HTTP 409 `CONCURRENCY_CONFLICT`.
- **Claim Lock**: Prevents conflicting actions between concurrent officers. An application claimed by Officer A cannot be claimed by Officer B (HTTP 409 `ALREADY_CLAIMED`).
- **Terminal State Protection**: Once an application reaches `APPROVED`, `REJECTED`, or `COMPLETED`, invalid backward transitions (e.g. attempting to reject a completed application) are rejected with HTTP 400 `ALREADY_DECIDED`.

---

## 4. Orchestration Engine Synchronization

When a department officer records a determination:
- **Approval (`APPROVED`)**: Identifies the corresponding task in the Phase 6 Orchestration DAG matching the officer's department, marks it `COMPLETED`, evaluates downstream dependency blocks, and recalculates the overall orchestration status.
- **Rejection (`REJECTED`)**: Requires a non-empty reason (minimum 5 characters), records officer decision remarks, marks the linked orchestration task as `FAILED`, and blocks downstream dependent tasks.

---

## 5. API Gateway Endpoints Introduced

All officer routes are authenticated and require `role === 'OFFICER'`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/officer/applications` | Departmental queue with status & search filtering |
| `GET` | `/api/v1/officer/workload` | Real-time workload statistics for the officer's department |
| `GET` | `/api/v1/officer/applications/:id` | Full application detail view with documents and timeline |
| `POST` | `/api/v1/officer/applications/:id/claim` | Claims application for review (supports optimistic concurrency) |
| `POST` | `/api/v1/officer/applications/:id/review` | Commences formal scrutiny (`UNDER_REVIEW`) |
| `POST` | `/api/v1/officer/applications/:id/clarification` | Requests clarification from citizen (`CLARIFICATION_REQUIRED`) |
| `POST` | `/api/v1/officer/applications/:id/notes` | Records private internal processing note |
| `POST` | `/api/v1/officer/applications/:id/approve` | Approves application and completes linked orchestration task |
| `POST` | `/api/v1/officer/applications/:id/reject` | Rejects application with documented mandatory reason |
| `POST` | `/api/v1/officer/applications/:id/complete` | Fulfills and completes an approved application |

---

## 6. Audit Timeline Stepper

Every transition produces an immutable event record appended to `app.timeline`:
- `SUBMITTED`: Initial submission by citizen.
- `CLAIMED`: Claimed by specific officer with timestamp.
- `REVIEW_STARTED`: Scrutiny commenced.
- `CLARIFICATION_REQUESTED`: Reason and requested information recorded.
- `APPROVED`: Officer decision, approval remarks, and orchestration sync.
- `REJECTED`: Documented rejection reason and justification.
- `COMPLETED`: Certificate generation and service closure.
