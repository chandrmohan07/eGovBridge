# Phase 6 — Smart Orchestration Engine

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 6

---

## 1. Overview

Phase 6 implements the **Smart Orchestration Engine**, the core platform module that coordinates multi-department workflows. When a citizen submits an application, the orchestration engine decomposes the request into an execution plan (a Directed Acyclic Graph, or DAG) of tasks across relevant government departments and adapters, enforcing dependencies, managing retries, isolating failures, and providing real-time progress tracking.

---

## 2. Core Architecture & Workflow Execution

```text
Citizen Application Submitted (Phase 5)
               ↓
    Smart Orchestration Engine
               ↓
   Identify Departments & Adapters
               ↓
      Build DAG Execution Plan
               ↓
     Execute Tasks in DAG Order
     (Independent tasks run without blocking;
      Dependent tasks wait for prerequisites)
               ↓
    Handle Success / Failure / Retry
    (Blocked downstream if prerequisite fails;
     Retry limit enforced with safe sandbox fallback)
               ↓
    Update Overall Application Status
```

---

## 3. Orchestration & Task Data Models

Stored in [`server/db.js`](../server/db.js) and [`server/orchestrator.js`](../server/orchestrator.js):

### Orchestration Model
- `id`: Unique identifier (e.g. `ORCH-2026-B8E1`)
- `applicationId`: Associated application ID (e.g. `APP-2026-EDU-A91B`)
- `applicantId`: Citizen ID (strictly enforced from authenticated session)
- `serviceId`: Target service code (e.g. `SRV-EDU-001`)
- `serviceName`: Target service title
- `department`: Primary department name
- `departmentCode`: Primary department code (`EDUCATION`, `REVENUE`, etc.)
- `tasks`: Array of task objects in DAG order
- `status`: Overall orchestration lifecycle state
- `retryCount`: Total orchestration retry counter
- `error`: High-level error summary (if any)
- `createdAt`, `updatedAt`, `completedAt`: Timestamps

### Task Model
- `id`: Task identifier (e.g. `TSK-01-TASK_IDENTITY_VERIFY`)
- `code`: Deterministic code string (e.g. `TASK_IDENTITY_VERIFY`, `TASK_REVENUE_INCOME_CHECK`)
- `title`: Human-readable task title
- `department`: Assigned government entity (e.g. `UIDAI / DigiLocker Gateway`)
- `departmentCode`: Internal department identifier
- `adapterCode`: Target interoperability adapter (`DIGILOCKER_ADAPTER`, `REV_ADAPTER`, `EDU_ADAPTER`, `PFMS_ADAPTER`)
- `description`: Detailed operational task description
- `dependencies`: Array of required prerequisite task codes (`[]` for independent tasks)
- `status`: Task lifecycle state
- `retryCount`: Individual task retry attempts
- `maxRetries`: Maximum allowable retries (default: `2`)
- `error`: Failure message (if failed or blocked)
- `startedAt`, `completedAt`: Execution timestamps
- `output`: Result metadata upon successful completion (`verdict: 'APPROVED'`, `referenceId`, `timestamp`)

---

## 4. Lifecycle States

### Task States
- `PENDING`: Waiting for prerequisites to complete.
- `READY`: All prerequisites fulfilled; ready for immediate execution.
- `IN_PROGRESS`: Task is currently executing in sandbox/adapter.
- `COMPLETED`: Execution succeeded; approval output recorded.
- `RETRYING`: Transient failure encountered; pending automatic retry.
- `FAILED`: Failure persists after exhausting `maxRetries`.
- `BLOCKED`: A prerequisite dependency failed or is blocked; prevents cascading invalid operations.

### Overall Orchestration States
- `CREATED`: Initial state after DAG plan formulation.
- `RUNNING`: Tasks are currently executing or ready to execute.
- `COMPLETED`: All tasks in the DAG completed successfully.
- `PARTIALLY_COMPLETED`: Some independent tasks completed, but one or more failed or are blocked.
- `FAILED`: Crucial entry task failed and exhausted all retry allowances.

---

## 5. Dependency Planner (DAG) Examples

### Higher Education Scholarship (`SRV-EDU-001`)
1. `TASK_IDENTITY_VERIFY` (DigiLocker / Aadhaar) — Dependencies: `[]` (Independent)
2. `TASK_ACADEMIC_RECORD` (Higher Education Board) — Dependencies: `[]` (Independent)
3. `TASK_REVENUE_INCOME_CHECK` (Revenue Department) — Dependencies: `['TASK_IDENTITY_VERIFY']`
4. `TASK_OFFICER_NODAL_REVIEW` (Education Nodal Review) — Dependencies: `['TASK_ACADEMIC_RECORD', 'TASK_REVENUE_INCOME_CHECK']`
5. `TASK_DISBURSEMENT_SANCTION` (PFMS DBT Sanction) — Dependencies: `['TASK_OFFICER_NODAL_REVIEW']`

### Revenue Income Certificate (`SRV-REV-002`)
1. `TASK_IDENTITY_VERIFY` (DigiLocker) — Dependencies: `[]`
2. `TASK_RESIDENCE_CHECK` (Municipal / Electoral Registry) — Dependencies: `[]`
3. `TASK_REVENUE_INSPECTION` (Taluk Revenue Field Enquiry) — Dependencies: `['TASK_IDENTITY_VERIFY', 'TASK_RESIDENCE_CHECK']`
4. `TASK_TEHSILDAR_DIGITAL_SIGN` (Tehsildar Digital Signature & Vault) — Dependencies: `['TASK_REVENUE_INSPECTION']`

---

## 6. REST API Endpoints

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/v1/orchestrations` | Citizen / Officer | Creates or retrieves orchestration for an application |
| `GET` | `/api/v1/orchestrations` | Authenticated | Lists orchestrations scoped to user role / department |
| `GET` | `/api/v1/orchestrations/:id` | Authenticated | Retrieves single orchestration record with full task DAG |
| `POST` | `/api/v1/orchestrations/:id/execute` | Citizen / Officer | Steps or completes DAG execution in dependency order |
| `POST` | `/api/v1/orchestrations/:id/retry` | Citizen / Officer | Resets and retries a failed/blocked task |

---

## 7. Security & Role-Based Access Control

- **Citizen Ownership Guard**: Citizen can only view, step, execute, or retry orchestrations belonging to their own applications (`HTTP 403 Forbidden` enforced on cross-citizen access).
- **Officer Department Scope**: Officers can access orchestrations matching their assigned `departmentCode`; requests across departmental boundaries receive `HTTP 403 Forbidden`.
- **Sandbox Security**: Uses internal deterministic mock handlers; no raw external credentials or untested webhooks are executed.
