# Phase 12 — Application Tracking

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 12  
**Backend Module**: [`server/tracking/tracking-service.js`](../server/tracking/tracking-service.js)  
**Frontend UI Component**: [`public/js/components/ApplicationTracking.js`](../public/js/components/ApplicationTracking.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)

---

## 1. Overview & Goal

Phase 12 delivers the **Citizen Application Tracking System**, providing citizens with a single unified tracking console to monitor real-time processing milestones, stage transitions, department scrutiny, clarification requests, and final determinations across all their submitted applications.

```text
Citizen
   ↓
My Applications (Multi-facet filtering: Status, Department, Search)
   ↓
Application Tracking Details (Sanitized, token-authenticated, privacy-preserving)
   ├── 1. Real-time Status Badge & Progress Percentage
   ├── 2. Safe Interoperability & Orchestration Milestones
   ├── 3. Audit Timeline Stepper (Generated from stored DB lifecycle events)
   ├── 4. Citizen Action Center (Clarification request view & response submission)
   ├── 5. Department Determination (Approved remarks, Documented rejection reasons)
   └── 6. Digital Fulfillment (Digital Certificate / Sanction Order download link)
```

---

## 2. Privacy & Security Rules Enforced

1. **Token-Derived Identity**:
   - Citizen identity is strictly derived from the validated JWT/Bearer session (`user.id`).
   - Clients cannot track or view another citizen's application (returns HTTP 403 Forbidden).
2. **Zero Internal Note Exposure**:
   - Officer private notes (`internalNotes`) are strictly omitted from citizen-facing tracking payloads.
3. **Zero Officer Personal Details Exposure**:
   - Direct personal officer contacts, personal phone numbers, or employee IDs are withheld; only public departmental authority titles (e.g. `EDUCATION Department Officer`) are shown.
4. **Confidential Inter-Department Data Shielding**:
   - Internal inter-department adapter data exchanges (Phase 10) and machine-level DAG task arguments (Phase 6) are abstracted into user-friendly milestones (e.g., *"Aadhaar & DigiLocker e-KYC Verification"*).

---

## 3. Endpoints Implemented via API Gateway

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/applications` | Authenticated Citizen / Officer / Admin | Retrieves user's applications. For citizens, supports filters `status`, `department`, and `search`. |
| `GET` | `/api/v1/applications/:id/tracking` | Authenticated (Owner, Department Officer, Admin) | Returns sanitized real-time tracking payload, timeline events, and safe orchestration milestones. |
| `POST` | `/api/v1/applications/:id/clarification/respond` | Authenticated Application Owner (Citizen) | Allows citizen to respond to an open clarification request with message & documents, transitioning status back to `UNDER_REVIEW`. |

---

## 4. Lifecycle Status Model & Progress Estimation

The tracking engine tracks statutory progress percentages and safe stages:

| Status | Progress % | Typical Stage Description |
|---|---|---|
| `DRAFT` | 10% | Draft in Progress |
| `SUBMITTED` | 25% | Application Submitted — Entered Departmental Queue |
| `RECEIVED` | 35% | Application Received by Nodal Ministry |
| `UNDER_REVIEW` | 50% | Active Scrutiny by Department Officer |
| `CLARIFICATION_REQUIRED` | 65% | Awaiting Citizen Clarification / Supplementary Proof |
| `PROCESSING` | 80% | Inter-Department Verification & Cross-Checks |
| `APPROVED` | 90% | Approved by Department Officer — Scheduled for Issuance |
| `COMPLETED` | 100% | Service Fulfilled & Digital Certificate Dispatched |
| `REJECTED` | 100% | Application Rejected with Documented Legal Ground |

---

## 5. Clarification Workflow & Resolution

When an officer flags an application for clarification in Phase 11 (`CLARIFICATION_REQUIRED`):
1. The citizen tracking console surfaces an **Action Required Alert Box** displaying the specific requested information and justification.
2. The citizen submits their explanation or supplemental document reference via `POST /api/v1/applications/:id/clarification/respond`.
3. The server marks the clarification `RESOLVED`, updates the application status to `UNDER_REVIEW`, updates `currentStage = 'Citizen Clarification Submitted — Under Officer Re-Evaluation'`, and records an immutable `CLARIFICATION_SUBMITTED` timeline node.

---

## 6. Audit Timeline Stepper

Timelines are dynamically rendered from actual stored database events:
- `SUBMITTED`: Timestamped initial submission.
- `CLAIMED`: Officer claim event.
- `REVIEW_STARTED`: Scrutiny commenced.
- `CLARIFICATION_REQUESTED`: Officer query and justification.
- `CLARIFICATION_SUBMITTED`: Citizen response recorded.
- `APPROVED`: Department approval and sanctions.
- `REJECTED`: Legally justified rejection ground.
- `COMPLETED`: Closure and digital certificate issuance.
