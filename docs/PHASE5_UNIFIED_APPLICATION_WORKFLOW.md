# Phase 5 — Unified Application Workflow

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 5

---

## 1. Overview

Phase 5 establishes the **Unified Government Service Application Workflow**, enabling citizens to apply for any government service directly through a single, consistent multi-step interface without being redirected to disparate departmental websites.

---

## 2. Multi-Step Application Architecture

```text
Citizen
   ↓
Service Catalog / Service Details
   ↓
[Start Application] (Context preserved)
   ↓
Step 1: Applicant Identity & Contact Information (Pre-filled from e-KYC profile)
   ↓
Step 2: Service-Specific Requirements (Dynamic form fields based on service code)
   ↓
Step 3: Document Uploads & Validation (File format and size validation; safe upload state)
   ↓
Step 4: Application Review & Legal Consent Declaration
   ↓
Step 5: Submission & Unique Reference Receipt (Status: SUBMITTED)
```

---

## 3. Application Data Model

Stored in [`server/db.js`](../server/db.js) and mirrored in client state [`public/js/store.js`](../public/js/store.js):

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique reference identifier (e.g. `APP-2026-EDU-A91B`) |
| `applicantId` | String | User ID of the applying citizen (enforced from token) |
| `applicantName` | String | Citizen's full legal name |
| `serviceId` | String | Target service identifier (e.g. `SRV-EDU-001`) |
| `serviceName` | String | Full title of the service |
| `departmentId` | String | Department ID (`DEP-EDU`, `DEP-REV`, etc.) |
| `departmentCode` | String | Department code (`EDUCATION`, `REVENUE`, etc.) |
| `status` | Enum | `DRAFT`, `IN_PROGRESS`, `READY_FOR_SUBMISSION`, `SUBMITTED` |
| `formData` | Object | All applicant and service-specific key-value responses |
| `documents` | Array | Array of attached document metadata (`name`, `fileName`, `fileSize`, `uploadDate`, `status`) |
| `createdAt` | ISO String | Creation timestamp |
| `updatedAt` | ISO String | Last modified timestamp |
| `submittedAt` | ISO String | Submission timestamp (`null` for drafts) |
| `currentStage` | String | Processing stage description |
| `amount` | String | Statutory application or grant amount |

---

## 4. Reusable Form & Validation System

Centralized in [`server/validation.js`](../server/validation.js):
- **Applicant Identity**: Required full name (min 3 chars), valid email regex, valid 10-digit mobile number, full residential address, district, state.
- **Service-Specific Fields**:
  - *Scholarships*: Educational institution, enrolled course, gross annual income, previous marks.
  - *Certificates*: Declared annual income, occupation, purpose.
  - *Health*: Ration card / beneficiary number, family member count.
  - *Transport*: Existing license number, expiry date.
  - *Agriculture*: Khasra/survey number, land holding acreage.
- **Document Security**:
  - Allowed extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`.
  - Strictly blocked executable extensions: `.exe`, `.bat`, `.sh`, `.cmd`, `.msi`, `.js`, `.py`, `.php`.
  - Max file size: 5 MB (5,242,880 bytes).
- **Drafts vs Final Submission**:
  - Drafts allow saving partial in-progress fields without blocking on required document uploads.
  - Final submission strictly enforces full completion of mandatory applicant details, service fields, and required documents.

---

## 5. REST API Endpoints

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/v1/applications` | Citizen | Creates an application draft or submits an application |
| `GET` | `/api/v1/applications` | Authenticated | Lists own applications for citizen; department applications for officer |
| `GET` | `/api/v1/applications/:id` | Authenticated | Retrieves single application details (ownership enforced) |
| `PUT` | `/api/v1/applications/:id` | Citizen | Updates an in-progress draft application |
| `POST` | `/api/v1/applications/:id/submit` | Citizen | Submits an existing draft after validation |

---

## 6. Security & Citizen Ownership Enforcement

- **Server-Side Identity**: `applicantId` is strictly bound to the authenticated JWT/session context on the backend. Client-supplied IDs in body payloads are completely ignored.
- **Ownership Route Guards**: Citizen B attempting to inspect, edit, or submit Citizen A's application via URL ID tampering receives `HTTP 403 Forbidden`.
- **Department Boundary Protection**: Officers attempting to access applications outside their assigned department receive `HTTP 403 Forbidden`.
- **Submission Immutability**: Applications marked as `SUBMITTED` cannot be modified via `PUT /api/v1/applications/:id`.
