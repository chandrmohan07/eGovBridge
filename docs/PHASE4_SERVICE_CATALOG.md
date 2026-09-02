# Phase 4 — Government Service Catalog

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 4

---

## 1. Overview

Phase 4 delivers the central **Government Service Catalog** for the SIH Government Service Integration Platform. It enables citizens to discover, search, filter, and inspect detailed requirements for government services from a single interface without needing to understand or navigate fragmented departmental websites.

---

## 2. Canonical Service Data Model

Every service in the catalog is structured according to the master schema:

| Field | Type | Description |
|---|---|---|
| `id` | String (Unique) | Canonical Service Identifier (e.g. `SRV-EDU-001`) |
| `code` | String | Internal service code (e.g. `SCHOLARSHIP_001`) |
| `title` | String | Official service title |
| `department` | String | Full department title |
| `departmentId` | String | Department ID mapping to [`server/db.js`](../server/db.js) |
| `departmentCode` | String | Department identifier (e.g. `EDUCATION`, `REVENUE`) |
| `adapterCode` | String | Future interoperability adapter identifier (e.g. `EDU_ADAPTER`) |
| `category` | String | Service category (Scholarships, Certificates, Health, Transport, Welfare Schemes) |
| `description` | String | Comprehensive plain-language service overview |
| `whoCanApply` | String | Target citizen demographic summary |
| `eligibility` | String | Detailed criteria (income limits, academic criteria, residency) |
| `requiredDocuments` | Array[String] | Array of mandatory verification documents |
| `turnaroundTime` | String | Estimated processing SLA |
| `applicationMethod` | String | Submission channel (`Online via Unified Citizen Portal`) |
| `serviceStatus` | String | Lifecycle status (`Active`) |
| `applicationAvailability`| String | Current intake status (`Open`) |
| `officialUrl` | String | Verified official government URL (NSP, myScheme, PIB) |
| `fee` | String | Statutory application fee (`Free` or nominal) |
| `integrationMode` | String | Interoperability tier (`Mock Adapter Active` / `Planned Adapter`) |
| `keywords` | Array[String] | Search indexing terms |
| `workflowStages` | Array[String] | Workflow sequence for Phase 5 & 6 orchestration |

---

## 3. Search & Multi-Faceted Filter Architecture

1. **Search Dimensions**:
   - Searches across Service Title, Description, Department Name, Department Code, Category, Eligibility text, Keywords, and Required Documents.
2. **Filter Controls**:
   - Category filter (Scholarships, Certificates & Revenue, Health, Transport, Welfare Schemes)
   - Department filter (Higher Education, Revenue & Land, Health & Family Welfare, Road Transport, Agriculture, Social Justice)
   - Application Availability filter (All, Open)
3. **Combined Filtering**:
   - Supports simultaneous keyword search combined with category and department restrictions.
   - Live result counts and a 1-click "Reset All Filters" action for zero-result states.

---

## 4. Service Details View

- Dedicated view accessible via the **"View Details"** card action.
- Displays full eligibility criteria, required documents checklist, turnaround time SLA, application fee, and official source link.
- Features breadcrumb navigation and **"← Back to Service Catalog"** controls.
- Houses the primary **"Start Application"** action bridging into Phase 5.

---

## 5. REST API Endpoints

| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/v1/services` | `search`, `category`, `department`, `availability` | Returns list of services matching search/filters |
| `GET` | `/api/v1/services/:id` | None | Returns single service detail object (404 if not found) |
| `GET` | `/api/v1/categories` | None | Returns list of distinct service categories |

---

## 6. Verification Results

Automated test suite [`tests/catalog.test.js`](../tests/catalog.test.js) passed all 14 test cases covering:
- Metadata field completeness across all 8 canonical services
- Search by title, keyword, and department
- Multi-faceted category, department, and combined filtering
- Retrieval by service ID and invalid ID 404 response
- Live HTTP API endpoints on static/dev server
- UI component rendering of catalog cards and service details
