# Phase 18 — Personalized Information System

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 18  
**Personalization Service Layer**: [`server/personalization/personalization-service.js`](../server/personalization/personalization-service.js)  
**Database Store & Helpers**: [`server/db.js`](../server/db.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**AI Chatbot Grounding**: [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js)  
**Frontend UI Component**: [`public/js/components/DashboardSummary.js`](../public/js/components/DashboardSummary.js)

---

## 1. Overview & Architecture

Phase 18 implements the **Personalized Information System**, transforming the general portal interface into a tailored, citizen-specific discovery dashboard:

> **Core Principle: "One citizen → one personalized government information dashboard."**

```text
Citizen Profile & Preferences
      ↓
Personalization Rule Engine
  ├── Persona Alignment (Student, Job Seeker, Farmer, Business, General)
  ├── Geographic & Location Relevance (State / Region / All India)
  ├── Academic & Qualification Matching (Level / Degree / Marksheet criteria)
  ├── Skills Alignment (Exact and partial competency matching)
  ├── Category & Department Preference Filters
  └── Application & Document Vault Lifecycle Awareness
      ↓
Explainable Recommendations ("Recommended because: ...")
      ↓
Personalized Citizen Dashboard
  ├── Priority Action Cards (Clarification requests, incomplete drafts, missing vault docs)
  ├── Recommended Services, Scholarships, Schemes, Jobs, and Bulletins
  └── Master Privacy Toggle & Recommendation Dismissal Controls
```

---

## 2. Eligibility Safety Guardrails

> [!IMPORTANT]
> **Safety Rule & Non-Authoritative Recommendations:**
> The personalization engine strictly acts as an **informational discovery layer**. It never claims:
> - *"You are officially eligible."*
> - *"Your application will be approved."*
> - *"You have qualified for this government grant."*
>
> All recommendations include the mandatory statutory notice:
> **`"Informational suggestion based on portal preferences. This does NOT guarantee official eligibility or approval. Official eligibility is determined solely by the respective government authority."`**

---

## 3. Data Models & Citizen Preferences

### A. Preference Model (`citizenPreferences`)
- `enabled`: Boolean master toggle (default: `true`).
- `persona`: `STUDENT` | `JOB_SEEKER` | `FARMER` | `BUSINESS` | `GENERAL`.
- `educationLevel`: e.g. `School`, `Undergraduate`, `Postgraduate`, `Vocational`.
- `qualification`: e.g. `B.Tech / B.E.`, `Class 8 / 9`, `Graduate`.
- `skills`: Array of competency keywords (e.g. `['Python', 'Cloud Infrastructure']`).
- `preferredLocation`: Geographic region (default: citizen's registered state or `All India`).
- `serviceInterests`: Followed service domains (e.g. `['Education', 'Scholarships']`).
- `schemeCategories`: Followed welfare types (e.g. `['Agriculture', 'Financial Inclusion']`).
- `employmentInterests`: Followed opportunity types (e.g. `['Government Jobs', 'Apprenticeships']`).
- `opportunityTypes`: Preferred listing classifications (`JOB`, `APPRENTICESHIP`, `SCHEME`).
- `updatedAt`: ISO timestamp.

### B. Dismissal Store (`dismissedRecommendations`)
- Tracks user-dismissed recommendation IDs (`userId -> Set<recommendationId>`), enabling citizens to hide suggestions they do not want to see.

---

## 4. Transparent Scoring & Explainability

Each candidate item is evaluated across weighted matching dimensions:

| Dimension | Points | Description |
|---|---|---|
| **Persona Alignment** | +35 pts | Aligns item type with primary citizen role (e.g. Student -> Scholarships, Job Seeker -> Employment) |
| **Category / Interest Alignment** | +25 pts | Matches citizen's selected interest tags |
| **Location Match** | +20 pts | Localized state match (+20 pts) or national All-India eligibility (+10 pts) |
| **Qualification Match** | +20 pts | Prerequisite educational attainment match |
| **Skill Match** | +15-45 pts | Competency overlap matching skills array |
| **Approaching Deadline** | +10 pts | Bonus for applications closing within 7 days |

Every recommendation output provides an array of human-readable **`recommendationReasons`** (e.g. *"Matches your Student profile"*, *"Matches your skill: Python"*, *"Available in your state (Maharashtra)"*).

---

## 5. Application-Aware & Vault-Aware Action Cards

1. **Clarification Requests**: Detects applications in status `CLARIFICATION_REQUIRED` and surfaces an urgent action banner linking directly to Application Tracking.
2. **Incomplete Drafts**: Identifies saved drafts and provides a 1-click shortcut to resume submission.
3. **Vault Document Recommendations**: If a student or farmer profile lacks an `INCOME_CERTIFICATE` in their vault, suggests proactive upload to unlock 1-click verification across services.

---

## 6. API Gateway Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/personalization/preferences` | `CITIZEN` | Retrieves current citizen's preferences |
| `PUT` | `/api/v1/personalization/preferences` | `CITIZEN` | Updates citizen preferences |
| `DELETE` | `/api/v1/personalization/preferences` | `CITIZEN` | Resets preferences to profile defaults |
| `GET` | `/api/v1/personalization/dashboard` | `CITIZEN` | Combined personalized dashboard overview |
| `GET` | `/api/v1/personalization/services` | `CITIZEN` | Top recommended government services |
| `GET` | `/api/v1/personalization/scholarships` | `CITIZEN` | Top recommended scholarships |
| `GET` | `/api/v1/personalization/schemes` | `CITIZEN` | Top recommended government schemes |
| `GET` | `/api/v1/personalization/employment` | `CITIZEN` | Top recommended jobs & apprenticeships |
| `GET` | `/api/v1/personalization/announcements` | `CITIZEN` | Top recommended official announcements |
| `POST` | `/api/v1/personalization/dismiss/:id` | `CITIZEN` | Dismisses a specific recommendation |
| `DELETE` | `/api/v1/personalization/dismiss/:id` | `CITIZEN` | Restores a dismissed recommendation |
| `GET` | `/api/v1/personalization/metrics` | `ADMIN` | Aggregated, anonymized engagement metrics |

---

## 7. AI Chatbot Integration

Integrated into [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js):
- Responds to natural queries like:
  - *"What opportunities are relevant to me?"*
  - *"Show scholarships matching my profile."*
  - *"What schemes match my preferences?"*
- Directly invokes `getPersonalizedDashboard(user)` and formats persona-aligned suggestions with reasons, action cards, and safety disclaimers.
