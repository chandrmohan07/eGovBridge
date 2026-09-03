# Phase 8 — Department Integration Adapter Layer

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 8

---

## 1. Overview

Phase 8 implements the **Department Integration Adapter Layer**, establishing a decoupled architectural boundary between the platform's orchestration/workflow logic and external/internal department systems.

Each government department system (education, land revenue, healthcare, transport, identity, social welfare) has unique protocols, payloads, data models, and verification steps. The Adapter Layer isolates these department-specific differences behind a common interface, translating canonical platform requests into department formats and normalizing downstream responses into standardized results.

> [!NOTE]
> **MOCK / SANDBOX NOTICE**: All Phase 8 adapters are implemented using high-fidelity local sandbox simulators. They do not claim to be live official government integrations. The architecture is engineered so that when official API access/approvals are granted, mock handlers can be swapped for live HTTP clients without altering any business logic.

---

## 2. Core Architecture

```text
Citizen / Officer / Admin Client
               ↓
    API Gateway (Phase 7)
               ├── Request Tracing (X-Request-Id)
               ├── Rate Limiting & Security Headers
               └── Downstream Timeout Protection
               ↓
    Smart Orchestration Engine (Phase 6)
               ├── Evaluates DAG Task Dependencies
               └── Resolves Required Department Tasks
               ↓
    Department Adapter Layer (Phase 8)
               ├── Adapter Registry & Factory
               │     ├── DIGILOCKER_ADAPTER (Identity & e-KYC)
               │     ├── EDU_ADAPTER (Higher Education Board)
               │     ├── HLT_ADAPTER (PM-JAY Health / NHA)
               │     ├── REV_ADAPTER (Land Records & Revenue)
               │     ├── TRN_ADAPTER (Sarathi / Transport)
               │     └── PFMS_ADAPTER (DBT / Social Welfare)
               ↓
    Normalized Standard Response Format
               ↓
    Orchestration Task & Application State Update
```

---

## 3. Common Adapter Interface (`BaseAdapter`)

Defined in [`server/adapters/base-adapter.js`](../server/adapters/base-adapter.js):

```javascript
class BaseAdapter {
  constructor({ code, department, departmentCode, enabled = true })
  executeTask(task, context)       // Entry point invoked by Orchestration Engine
  processTask(task, context)       // Department-specific processing logic
  healthCheck(options)             // Adapter health & connectivity probe
  formatSuccess(options)           // Standardized success response builder
  formatError(options)             // Standardized error response builder
}
```

### Standard Internal Adapter Response Format

**Success Response:**
```json
{
  "success": true,
  "department": "Department of Higher Education",
  "departmentCode": "EDUCATION",
  "adapterCode": "EDU_ADAPTER",
  "operation": "TASK_ACADEMIC_RECORD",
  "status": "COMPLETED",
  "referenceId": "REF-EDU-A1B2C3",
  "data": {
    "verdict": "APPROVED",
    "institutionStatus": "RECOGNIZED_UGC_AICTE",
    "marksValidation": "MATCHED_WITH_BOARD_RECORDS"
  },
  "timestamp": "2026-09-03T05:20:00.000Z",
  "requestId": "req-1725340800000-abcd1234",
  "isMock": true
}
```

**Failure Response:**
```json
{
  "success": false,
  "department": "Department of Higher Education",
  "departmentCode": "EDUCATION",
  "adapterCode": "EDU_ADAPTER",
  "operation": "TASK_ACADEMIC_RECORD",
  "status": "FAILED",
  "error": {
    "code": "DOWNSTREAM_ERROR",
    "message": "Downstream service for Department of Higher Education timed out."
  },
  "timestamp": "2026-09-03T05:20:00.000Z",
  "requestId": "req-1725340800000-abcd1234",
  "isMock": true
}
```

---

## 4. Implemented Department Mock Adapters

| Adapter Code | Department / Service Domain | File | Verified Operations |
|---|---|---|---|
| `DIGILOCKER_ADAPTER` | Identity & Digital Locker | [`identity-adapter.js`](../server/adapters/identity-adapter.js) | Aadhaar e-KYC, DigiLocker credential retrieval |
| `EDU_ADAPTER` | Higher Education Board | [`education-adapter.js`](../server/adapters/education-adapter.js) | UGC/AICTE enrollment check, board marks validation |
| `HLT_ADAPTER` | Health & Family Welfare (PM-JAY) | [`health-adapter.js`](../server/adapters/health-adapter.js) | SECC quota eligibility, Golden Card token generation |
| `REV_ADAPTER` | Land Records & State Revenue | [`revenue-adapter.js`](../server/adapters/revenue-adapter.js) | Bhulekh land mutation, income ceiling, Tehsildar PKI digital sign |
| `TRN_ADAPTER` | Road Transport (Sarathi/Parivahan) | [`transport-adapter.js`](../server/adapters/transport-adapter.js) | Driving license validity, RTO jurisdiction check |
| `PFMS_ADAPTER` | Welfare DBT & Financial Management | [`welfare-adapter.js`](../server/adapters/welfare-adapter.js) | NPCI Aadhaar bank mapper, DBT sanction batch disbursement |

---

## 5. Adapter Registry & Factory

Implemented in [`server/adapters/adapter-registry.js`](../server/adapters/adapter-registry.js):

- **Dynamic Discovery**: Maps adapter codes (`EDU_ADAPTER`) and department aliases (`EDUCATION`, `HIGHER_EDUCATION`) to their singleton adapter instances.
- **Runtime Toggling**: `enableAdapter(code)` / `disableAdapter(code)` allows operational isolation during maintenance or outages.
- **Health Probing**: `healthCheckAll()` provides platform-wide status of all connected department gateways.

---

## 6. Integration with Orchestration & Gateway

### Orchestration Engine (`server/orchestrator.js`)
When `executeTask(task, context)` runs:
1. It queries `adapterRegistry.getAdapter(task.adapterCode || task.departmentCode)`.
2. Dispatches execution to `adapter.executeTask(task, context)`.
3. Normalizes response into `task.output` and manages DAG state (`COMPLETED`, `RETRYING`, `FAILED`, `BLOCKED`).

### API Gateway (`server/api-router.js`)
Exposes dedicated management endpoints protected behind authentication:
- `GET /api/v1/adapters`: Lists registered adapters and metadata.
- `GET /api/v1/adapters/:code/health`: Health probe for a specific adapter.
- `POST /api/v1/adapters/:code/execute`: Direct adapter task testing sandbox.

---

## 7. Replacing Mock Adapters with Live Integrations (Future Work)

When official government department credentials and OAuth2 / mTLS approvals are obtained:
1. Extend `BaseAdapter` with an HTTP/REST/SOAP client using credentials from environment variables (`DEPARTMENT_BASE_URL`, `DEPARTMENT_CLIENT_ID`, `DEPARTMENT_CLIENT_SECRET`).
2. Implement mutual TLS (mTLS) certificate loading or signature headers (e.g. X-DigiLocker-HMAC).
3. Override `processTask(task, context)` to call the external endpoint and map the live response into `this.formatSuccess(...)`.
4. Register the endpoint in `config/external-apis.json` following the external API checklist.
5. The orchestration engine and frontend require **zero code changes**.
