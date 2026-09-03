# Phase 10 — Secure Inter-Department Data Exchange

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 10  
**Implementation Modules**: [`server/exchange/`](../server/exchange/)

---

## 1. Overview & Architectural Goal

Phase 10 implements the **Secure Inter-Department Data Exchange Layer**, preventing unrestricted department-to-department data harvesting.

Every cross-department interaction follows the principle of **Need-to-Know & Data Minimization**:
- No department can request arbitrary citizen data.
- Every exchange request must be authenticated, authorized against an explicit policy matrix, purpose-limited, validated, minimized to only the permitted fields, and immutably audited.

```text
Citizen / Application
         ↓
API Gateway (Phase 7)
         ↓
Smart Orchestration Engine (Phase 6)
         ↓
Department Adapter (Phase 8)
         ↓
Canonical Data Model (Phase 9)
         ↓
SECURE INTER-DEPARTMENT DATA EXCHANGE LAYER (Phase 10)
├── 1. Security Policy & Allowed Pair Evaluation
├── 2. Purpose Limitation Verification
├── 3. Citizen Technical Consent Validation
├── 4. Field-Level Data Minimization Engine
├── 5. Timeout SLA Expiration Enforcer
└── 6. Immutable Audit Trail Logger
         ↓
Authorized Target Department Adapter
```

---

## 2. Core Modules & Engine Components

### 2.1 Security Policies Matrix ([`server/exchange/policies.js`](../server/exchange/policies.js))
Enforces allowed department pairs, permitted purposes, and explicit field whitelists:

| Source Dept | Target Dept | Authorized Purpose | Permitted Fields |
|---|---|---|---|
| `DIGILOCKER` | `EDUCATION` | `ACADEMIC_ENROLLMENT_VERIFICATION` | `citizenId`, `name`, `dateOfBirth`, `gender`, `mobile`, `address` |
| `REVENUE` | `EDUCATION` | `INCOME_SCHOLARSHIP_VERIFICATION` | `citizenId`, `name`, `revenueDetails`, `address` |
| `EDUCATION` | `FINANCE` | `SCHOLARSHIP_DISBURSEMENT_VALIDATION` | `citizenId`, `name`, `academicDetails`, `mobile` |
| `DIGILOCKER` | `HEALTH` | `AYUSHMAN_BENEFICIARY_VERIFICATION` | `citizenId`, `name`, `dateOfBirth`, `gender`, `mobile`, `address` |
| `REVENUE` | `HEALTH` | `SECC_POVERTY_LINE_VERIFICATION` | `citizenId`, `name`, `revenueDetails` |
| `DIGILOCKER` | `TRANSPORT` | `DRIVING_LICENSE_VERIFICATION` | `citizenId`, `name`, `dateOfBirth`, `address`, `mobile` |
| `FINANCE` | `EDUCATION` | `DBT_DISBURSEMENT_AUDIT` | `citizenId`, `financialDetails` |

*Any request with an unauthorized department pair, invalid purpose, or unauthorized field request is immediately rejected with HTTP 403.*

### 2.2 Data Minimization Engine ([`server/exchange/data-minimizer.js`](../server/exchange/data-minimizer.js))
If a department possesses a full citizen record containing addresses, financial details, and health data, but the authorized purpose requires only `['name', 'dateOfBirth']`, `minimizeData` strips all unrequested fields, ensuring that only the strictly necessary payload is delivered to the target department.

### 2.3 Exchange Service ([`server/exchange/exchange-service.js`](../server/exchange/exchange-service.js))
Manages the complete lifecycle of exchange records:
- **States**: `PENDING`, `AUTHORIZED`, `PROCESSING`, `COMPLETED`, `REJECTED`, `FAILED`, `EXPIRED`.
- **Timeout SLA**: Governed by `DATA_EXCHANGE_TIMEOUT_SECONDS = 60`. Expired exchanges are transitioned to `EXPIRED` and rejected.
- **Retries**: Configurable `MAX_EXCHANGE_RETRIES = 2`.

---

## 3. RBAC & Security Boundaries

- **Citizen**: Can view only data exchanges linked to their own applications. Cross-tenant access is rejected with HTTP 403.
- **Officer**: Can view only exchanges where their assigned department is either the source or target. Cross-department queries are rejected with HTTP 403.
- **Administrator**: Can view all exchanges and query system-wide audit logs.
- **Audit Trails**: Redacts passwords, tokens, API keys, and sensitive financial records.

---

## 4. API Gateway Endpoints Introduced

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/exchange/policies` | Lists active department exchange authorization policies |
| `POST` | `/api/v1/exchange/requests` | Initiates and validates a new inter-department exchange request |
| `GET` | `/api/v1/exchange/requests/:id` | Retrieves exchange details and minimized data (role-scoped) |
| `POST` | `/api/v1/exchange/requests/:id/execute` | Executes the exchange transfer and dispatches to target adapter |
| `GET` | `/api/v1/exchange/audit` | Retrieves exchange audit logs (Officer / Admin only) |
