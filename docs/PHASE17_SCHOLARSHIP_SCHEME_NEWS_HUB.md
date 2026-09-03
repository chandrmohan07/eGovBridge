# Phase 17 — Scholarship, Government Scheme & News Hub

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 17  
**Data Source Abstraction**: [`server/content-hub/sources/content-source.js`](../server/content-hub/sources/content-source.js)  
**Content Service Layer**: [`server/content-hub/content-service.js`](../server/content-hub/content-service.js)  
**Database Store & Helpers**: [`server/db.js`](../server/db.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**AI Chatbot Integration**: [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js)  
**Frontend UI Components**:  
- [`public/js/components/ScholarshipsHub.js`](../public/js/components/ScholarshipsHub.js)  
- [`public/js/components/GovernmentSchemes.js`](../public/js/components/GovernmentSchemes.js)  
- [`public/js/components/NewsAnnouncements.js`](../public/js/components/NewsAnnouncements.js)

---

## 1. Overview & Architecture

Phase 17 builds a centralized **Scholarship, Government Scheme, and News/Announcement Hub** enabling citizens to discover verified education scholarships, national welfare schemes, and official press bulletins from a single unified portal.

```text
Citizen / Applicant
      ↓
API Gateway (/api/v1/content/*)
      ↓
Content Hub Service Layer
  ├── Scholarships Engine (Search, Eligibility, Approaching Deadlines, Vault Checks)
  ├── Government Schemes Engine (Category & Department Filters, Service Cross-links)
  ├── News & Announcements Engine (Published Feeds, Expiry Handlers, Category Filters)
  ├── Reusable Saved Content Architecture (User -> Set<type:id>, Strict Citizen Isolation)
  └── Admin Content Governance (RBAC: ADMIN only, Audit Logging)
      ↓
Content Source Abstraction (MockContentSource — Prototype Verified Mock Feeds)
      ↓
Downstream Integrations
  ├── Service Catalog (Direct 'Apply on Portal' via relatedServiceId)
  ├── Document Vault (Checks whether citizen has required documents stored in vault)
  └── AI Chatbot Assistance (Answers queries for scholarships, schemes, and news)
```

---

## 2. Mock / Demo Data Transparency

> [!NOTE]
> **MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION**
> In accordance with project instructions and `PLAN.md`, all content items operate using validated local demonstration records based on official taxonomies (National Scholarship Portal, myScheme, and Press Information Bureau). External live APIs are not claimed to be connected until officially approved and configured.

---

## 3. Data Models

### A. Scholarship (`SCHOLARSHIPS`)
- `id`: Unique identifier (e.g. `SCH-2026-001`).
- `name` / `title`: Official scheme title (e.g. `National Means-cum-Merit Scholarship Scheme`).
- `provider` / `ministry`: Nodal ministry (e.g. `Ministry of Education`).
- `department`: Line department (e.g. `Department of School Education & Literacy`).
- `category`: `Need-based / School Education`, `Merit-based / Higher Education`, `Girls Empowerment / Technical Education`.
- `description`: Scope of assistance.
- `eligibility`: Academic and income thresholds.
- `qualification`: Education level requirements.
- `incomeCriteria`: Family income ceiling.
- `benefitAmount`: Financial grant description (e.g. `₹12,000 per annum`).
- `requiredDocuments`: Array of required verification certificates.
- `deadline`: Application cutoff date (`YYYY-MM-DD`).
- `applicationUrl`: Official centralized portal link (`https://scholarships.gov.in`).
- `relatedServiceId`: Linked Service Catalog ID (`SRV-EDU-001`) enabling direct online application.
- `source`: `National Scholarship Portal`.
- `status`: `ACTIVE` / `INACTIVE`.
- `verified`: `true`.
- `isMock`: `true`.

### B. Government Scheme (`GOVERNMENT_SCHEMES`)
- `id`: Unique identifier (e.g. `SCHEME-2026-001`).
- `name` / `title`: Official scheme name (e.g. `PM SVANidhi`, `PMFBY`).
- `department`: Line ministry.
- `category`: `Skill Development`, `Financial Inclusion`, `Agriculture`, `Welfare Schemes`.
- `description`: Scheme overview.
- `purpose`: Socioeconomic intent.
- `eligibility`: Target beneficiary criteria.
- `benefits`: Key entitlements.
- `targetAudience`: Demographic segment.
- `requiredDocuments`: Array of prerequisite certificates.
- `applicationProcess`: Procedural guidance.
- `applicationUrl`: Official portal link (`https://www.myscheme.gov.in`).
- `relatedServiceId`: Linked Service Catalog ID (e.g. `SRV-AGR-005`).
- `source`: `myScheme Portal`.
- `status`: `ACTIVE` / `INACTIVE`.

### C. Announcement & News (`ANNOUNCEMENTS`)
- `id`: Unique identifier (e.g. `NEWS-2026-001`).
- `title`: Announcement headline.
- `summary`: High-level abstract.
- `content`: Full circular or press release text.
- `department`: Issuing authority.
- `category`: `Deadlines`, `Service Updates`, `Employment`.
- `publishedAt`: Publication date.
- `expiryDate`: Expiry cutoff date.
- `source`: `Press Information Bureau (PIB)`.
- `officialReference`: Circular reference ID.
- `status`: `PUBLISHED` / `ARCHIVED`.

---

## 4. Key Capabilities & Integrations

1. **Service Catalog Integration**:
   - When an item has a `relatedServiceId` (e.g. `SRV-EDU-001` or `SRV-AGR-005`), the API automatically enriches the entity with `{ canApplyOnline: true, id, title, department }`.
   - The UI displays an **"Apply on Portal"** button directly routing the citizen to the unified application workflow without creating duplicate workflows.
2. **Document Vault Integration**:
   - For authenticated citizens, `getScholarshipById` cross-references `db.getUserVaultDocuments(user.id)` against `requiredDocuments` and reports `vaultStatus` (`availableInVault: true/false`).
3. **Approaching Deadline Engine**:
   - Automatically computes `closingSoon: true` for scholarships expiring within 7 days.
4. **Reusable Saved Items Architecture**:
   - Backed by `savedHubItems` map (`userId -> Set<type:id>`).
   - Enforces strict user ownership: citizens cannot access another user's bookmarked records.
5. **AI Chatbot Grounding**:
   - Integrated into [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js).
   - Citizens can ask: *"What scholarships are available?"*, *"Tell me about PM SVANidhi"*, or *"What are the latest announcements?"*
   - Chatbot queries Content Hub data directly and outputs grounded responses with official links (`scholarships.gov.in`, `myscheme.gov.in`, `pib.gov.in`).
6. **Administrative Content Governance**:
   - Role-governed CRUD operations (`requireRole(user, ['ADMIN'])`) with audit logging (`SCHOLARSHIP_CREATED`, `SCHEME_CREATED`, `ANNOUNCEMENT_PUBLISHED`, etc.).

---

## 5. API Gateway Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/content/scholarships` | Public / Authenticated | Lists & searches scholarships with filters & pagination |
| `GET` | `/api/v1/content/scholarships/saved` | `CITIZEN` | Retrieves current citizen's saved scholarships |
| `GET` | `/api/v1/content/scholarships/:id` | Public / Authenticated | Retrieves single scholarship details + vault check |
| `POST` | `/api/v1/content/scholarships/saved/:id` | `CITIZEN` | Saves/bookmarks a scholarship |
| `DELETE` | `/api/v1/content/scholarships/saved/:id` | `CITIZEN` | Removes a saved scholarship |
| `POST` | `/api/v1/content/scholarships` | `ADMIN` | Creates a new scholarship |
| `PUT` | `/api/v1/content/scholarships/:id` | `ADMIN` | Updates an existing scholarship |
| `DELETE` | `/api/v1/content/scholarships/:id` | `ADMIN` | Deactivates a scholarship |
| `GET` | `/api/v1/content/schemes` | Public / Authenticated | Lists & searches welfare schemes |
| `GET` | `/api/v1/content/schemes/saved` | `CITIZEN` | Retrieves current citizen's saved schemes |
| `GET` | `/api/v1/content/schemes/:id` | Public / Authenticated | Retrieves single scheme details + linked service |
| `POST` | `/api/v1/content/schemes/saved/:id` | `CITIZEN` | Saves/bookmarks a scheme |
| `DELETE` | `/api/v1/content/schemes/saved/:id` | `CITIZEN` | Removes a saved scheme |
| `POST` | `/api/v1/content/schemes` | `ADMIN` | Creates a new government scheme |
| `PUT` | `/api/v1/content/schemes/:id` | `ADMIN` | Updates an existing scheme |
| `DELETE` | `/api/v1/content/schemes/:id` | `ADMIN` | Deactivates a scheme |
| `GET` | `/api/v1/content/announcements` | Public | Lists announcements sorted by date |
| `GET` | `/api/v1/content/announcements/:id` | Public | Retrieves announcement details |
| `POST` | `/api/v1/content/announcements` | `ADMIN` | Creates an announcement |
| `PUT` | `/api/v1/content/announcements/:id` | `ADMIN` | Updates an announcement |
| `DELETE` | `/api/v1/content/announcements/:id` | `ADMIN` | Archives an announcement |
