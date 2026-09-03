# Phase 16 — Employment Hub

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 16  
**Data Source Abstraction**: [`server/employment/sources/employment-source.js`](../server/employment/sources/employment-source.js)  
**Employment Service**: [`server/employment/employment-service.js`](../server/employment/employment-service.js)  
**Database Store & Helpers**: [`server/db.js`](../server/db.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**AI Chatbot Integration**: [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js)  
**Frontend UI Component**: [`public/js/components/EmploymentHub.js`](../public/js/components/EmploymentHub.js)

---

## 1. Overview & Objective

Phase 16 delivers the **Employment Hub**, an organized portal interface enabling citizens to discover verified employment opportunities, public sector vacancies, skill-development training programs, apprenticeships, and government employment schemes in a single unified interface.

```text
Citizen / Applicant
      ↓
API Gateway (/api/v1/employment)
      ↓
Employment Service Layer
  ├── Search & Multi-Param Filtering (Keyword, Category, Qualification, SLA)
  ├── Approaching Deadline Detection (Closing Soon <= 7 days)
  ├── Bookmark / Saved Opportunities (User isolation)
  ├── Personalized Recommendations Foundation (Regional scoring)
  └── Admin Content Management (RBAC: ADMIN only)
      ↓
Employment Data Source Abstraction
  ├── Primary: MockEmploymentSource (Grounded prototype records)
  └── Planned: NCSSource (National Career Service integration)
      ↓
UI Feed & AI Chatbot Assistance
```

---

## 2. Mock / Demo Data Notice

> [!NOTE]
> **MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION**
> In accordance with project instructions and `PLAN.md`, all employment listings operate using validated local demonstration data based on official taxonomies (National Career Service, NSDC, SSC, and Ministry of Rural Development). External live APIs are not claimed to be connected until officially approved and configured.

---

## 3. Data Model (`EmploymentOpportunity`)

Each opportunity record conforms to:
- `id`: Unique identifier (e.g. `EMP-2026-001`).
- `title`: Position or scheme title.
- `organization`: Hiring or nodal entity (e.g. `National Informatics Centre (NIC)`).
- `department`: Line ministry or department.
- `category`: `Government Jobs`, `Apprenticeships`, `Skill Development`, `Employment Schemes`.
- `opportunityType`: `JOB`, `APPRENTICESHIP`, `TRAINING`, `SCHEME`.
- `description`: Scope of role or scheme details.
- `eligibility`: Educational qualifications and prerequisite criteria.
- `qualification`: Target educational benchmark (`Graduate`, `Post-Graduate`, `12th Pass`, `10th Pass`).
- `skills`: Required competencies array.
- `location`: Deployment location or `All India`.
- `vacancies`: Number of openings.
- `salary`: Pay scale / stipend description.
- `deadline`: Application cutoff date (`YYYY-MM-DD`).
- `applicationUrl`: Official centralized application link (`https://www.ncs.gov.in`).
- `source`: Attributed authority (`National Career Service (NCS)`).
- `status`: `ACTIVE` or `INACTIVE`.
- `isMock`: Flagged as `true` for demo transparency.
- `lastVerifiedAt`: Verification date.

---

## 4. Key Capabilities

1. **Search & Multi-Parameter Filtering**:
   - Case-insensitive search matching title, organization, description, and required skill tags.
   - Category filtering (`Government Jobs`, `Apprenticeships`, `Skill Development`, `Employment Schemes`).
   - Qualification filtering (`Graduate`, `12th Pass`, `10th Pass`).
   - Approaching deadline calculation: Opportunities expiring within 7 days are automatically tagged with `closingSoon: true` and rendered with a `⚠️ Closing Soon` badge.
2. **Saved / Bookmarked Opportunities**:
   - Authenticated citizens can bookmark opportunities for later tracking.
   - Enforces strict user isolation: a citizen can never see another user's saved bookmarks.
   - Includes immutable audit logging for save and remove operations.
3. **Personalized Recommendations Foundation**:
   - Matches opportunities based on user profile state/region and high-priority national vacancies.
   - Explicitly disclaims recommendations as informational suggestions, not official eligibility guarantees.
4. **AI Help Chatbot Integration**:
   - Connected with Phase 15 AI Chatbot knowledge base.
   - Citizens can ask: *"Show me government jobs"*, *"Find apprenticeships"*, or *"What skill training is available?"*
   - Chatbot queries Employment Hub data directly and outputs grounded responses with NCS source links and direct navigation shortcuts.
5. **Administrative Content Governance**:
   - Role-based authorization (`requireRole(user, ['ADMIN'])`).
   - Admins can create new listings, update vacancies or salaries, and deactivate expired postings.

---

## 5. API Gateway Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/employment/opportunities` | Public / Authenticated | Lists & searches opportunities with filters & pagination |
| `GET` | `/api/v1/employment/opportunities/recommended` | `CITIZEN` | Retrieves scored opportunity recommendations |
| `GET` | `/api/v1/employment/opportunities/:id` | Public / Authenticated | Retrieves single opportunity details |
| `GET` | `/api/v1/employment/saved` | `CITIZEN` | Lists saved opportunities for current user |
| `POST` | `/api/v1/employment/saved/:id` | `CITIZEN` | Saves/bookmarks an opportunity |
| `DELETE` | `/api/v1/employment/saved/:id` | `CITIZEN` | Removes a saved opportunity |
| `POST` | `/api/v1/employment/opportunities` | `ADMIN` | Creates a new opportunity |
| `PUT` | `/api/v1/employment/opportunities/:id` | `ADMIN` | Updates an existing opportunity |
| `DELETE` | `/api/v1/employment/opportunities/:id` | `ADMIN` | Deactivates an opportunity |

---

## 6. Frontend UI Component

Updated [`public/js/components/EmploymentHub.js`](../public/js/components/EmploymentHub.js):
- Header featuring official NCS source link (`https://www.ncs.gov.in`) and mock demo data badge.
- Category tabs (`All`, `Government Jobs`, `Apprenticeships`, `Skill Development`, `Employment Schemes`, `⭐ Saved`).
- Dynamic opportunity cards with vacancies, deadline indicators, eligibility criteria, and one-click bookmarking.
- Maintains 100% backward compatibility with Phase 2 UI unit tests.
