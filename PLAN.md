# SIH Government Service Integration Platform — Antigravity Master Plan

## 0. Project Objective

Build a unified government-service platform that reduces fragmented service delivery by connecting multiple government digital systems through a secure interoperability layer.

The platform will provide:

- Unified government service discovery and applications
- Secure authentication and role-based access
- Smart orchestration and service routing
- API Gateway and department adapters
- Data standardization and controlled inter-department exchange
- Application tracking
- Digital document vault
- Notifications
- AI Government Help Chatbot
- Employment and job information
- Scholarship, government scheme, announcement and news updates
- Feedback and grievance management
- Admin dashboard, analytics and audit logs

### Core SIH Positioning

> One citizen interface, many government systems, one interoperable workflow.

---

# 1. NON-NEGOTIABLE ANTIGRAVITY EXECUTION RULES

These rules apply to every phase and every prompt used with Antigravity.

## Rule 1 — Phase Gate / Stop Rule

**Antigravity MUST stop after completing each phase.**

After a phase is completed:

1. Verify the phase.
2. Run the required checks.
3. Report what was completed.
4. Report any issues.
5. **STOP.**
6. Do not automatically start the next phase.
7. Wait for the user's next explicit prompt.

### Required behavior

```text
PHASE START
    ↓
Implement only this phase
    ↓
Test this phase
    ↓
Verify files
    ↓
Give completion report
    ↓
STOP
    ↓
WAIT FOR USER PROMPT
    ↓
Next phase starts only after explicit instruction
```

Antigravity must never interpret "continue", "improve", or internal TODOs as permission to begin the next phase unless the user explicitly requests the next phase.

---

# 2. CREDIT-EFFICIENCY RULES

The project must be developed efficiently and avoid unnecessary AI/API/tool usage.

## Rule 2 — No Wasted Work

Antigravity MUST:

- Inspect existing files before creating replacements.
- Reuse existing components, utilities and styles.
- Avoid rebuilding working modules.
- Avoid duplicate files.
- Avoid duplicate API calls.
- Avoid repeated dependency installation.
- Avoid generating unnecessary large files.
- Avoid changing unrelated code.
- Avoid redesigning working UI unless explicitly requested.
- Make the smallest safe change that satisfies the phase.
- Test targeted functionality rather than repeatedly testing the entire project after every small change.

### Before editing

```text
1. Inspect repository
2. Identify relevant files
3. Understand existing implementation
4. Reuse existing code
5. Modify only necessary files
6. Test the change
```

### Never do this

```text
Existing working feature
        ↓
Delete it
        ↓
Rebuild from zero
```

### Prefer this

```text
Existing working feature
        ↓
Inspect
        ↓
Extend / refactor only where necessary
        ↓
Test
```

---

# 3. EXTERNAL API AND URL STORAGE RULE

## Rule 3 — Central External Configuration

**Every external API, URL, endpoint, service URL, webhook URL, documentation URL, public data source URL, or third-party integration URL MUST be stored centrally and must NOT be scattered throughout the codebase.**

Create one dedicated configuration area in the project.

Recommended structure:

```text
project-root/
│
├── config/
│   ├── external-apis.json
│   ├── external-urls.json
│   └── README.md
│
├── .env.example
├── .env
│
└── ...
```

### Important

- `.env` must NOT be committed to Git.
- `.env.example` contains variable names and safe placeholders only.
- Public/non-secret URLs can be stored in `config/external-urls.json`.
- API keys, tokens and secrets must be stored through environment variables or an approved secret manager.
- Never hard-code API keys in HTML, JavaScript, React components, backend source files, or database seed data.
- Never expose secret API keys to the browser.
- Backend-only secrets must remain server-side.

### Example

`config/external-apis.json`

```json
{
  "governmentSystems": {
    "education": {
      "baseUrl": "${EDUCATION_API_URL}",
      "enabled": true
    },
    "health": {
      "baseUrl": "${HEALTH_API_URL}",
      "enabled": false
    },
    "land": {
      "baseUrl": "${LAND_API_URL}",
      "enabled": false
    }
  },
  "chatbot": {
    "baseUrl": "${CHATBOT_API_URL}",
    "enabled": false
  }
}
```

`config/external-urls.json`

```json
{
  "officialSources": {
    "scholarships": "",
    "governmentSchemes": "",
    "employment": "",
    "announcements": ""
  }
}
```

### Every external integration must have:

```text
Name
Purpose
Base URL
Endpoint
Authentication method
Environment variable name
Request method
Required parameters
Response format
Owner/source
Enabled/disabled status
Last verified date
```

---

# 4. API / URL REGISTRY

Maintain a human-readable registry:

```text
config/README.md
```

Example:

```markdown
# External API & URL Registry

| Name | Purpose | URL/Env | Auth | Used By | Status |
|------|---------|---------|------|---------|--------|
| Education API | Education verification | EDUCATION_API_URL | Token | Integration Adapter | Mock |
| Health API | Health verification | HEALTH_API_URL | Token | Health Adapter | Planned |
| Scholarship Source | Scholarship updates | SCHOLARSHIP_SOURCE_URL | Public | Information Hub | Planned |
| Employment Source | Employment updates | EMPLOYMENT_SOURCE_URL | Public | Employment Hub | Planned |
```

No external URL should be introduced without updating this registry.

---


## Rule 4 — Outside Work / External Setup Checklist

**After EVERY phase, Antigravity MUST clearly tell the user what must be done OUTSIDE the project/code before the next phase can safely continue.**

This section is mandatory even when no outside work is required. In that case, explicitly write **"No outside work required for this phase."**

### What "Outside Work" means

Outside Work includes anything the user must do outside Antigravity/project code, such as:

- Create an account on an external service.
- Register/login to an official developer portal.
- Apply for or request API access.
- Create a project/application in an external portal.
- Enable an API or service.
- Generate an API key, Client ID, Client Secret, access token, webhook secret, or similar credential.
- Obtain or verify an external API/base URL/endpoint.
- Read or accept an external service's terms/approval requirements.
- Configure a database, hosting account, domain, email provider, SMS provider, storage provider, LLM provider, or other external service.
- Obtain official government integration permission when required.
- Collect official documentation or source URLs.
- Perform manual verification/testing outside the application.

### Mandatory Outside Work Report

At the end of every phase, include:

```text
==================================================
OUTSIDE WORK — USER MUST DO
==================================================

STATUS:
- Required / Optional / No outside work required

1. SERVICE / API:
   - Name:
   - Purpose:
   - Why we need it:
   - Required now: YES / NO

2. WEBSITE / PORTAL:
   - Official website:
   - Developer portal/login page:
   - Documentation page:
   - Exact URL if known:
   - If the URL is not verified, write "URL TO BE VERIFIED".
   - Never invent a URL.

3. ACCOUNT / LOGIN:
   - Need account: YES / NO
   - Registration required: YES / NO
   - What account type:
   - What verification is required:
   - Do not ask the user to share passwords.

4. API / CREDENTIALS:
   - API access required: YES / NO
   - API key: YES / NO
   - Client ID: YES / NO
   - Client Secret: YES / NO
   - OAuth/token setup: YES / NO
   - Other credential:
   - Approval required: YES / NO / UNKNOWN

5. URL / ENDPOINT:
   - Base URL:
   - Endpoint(s):
   - Webhook URL:
   - Documentation URL:

6. WHERE TO CONFIGURE IT:
   - Environment variable(s):
   - Config file:
   - Backend-only or public:
   - Never put secrets in frontend code.

7. WHAT THE USER SHOULD BRING BACK:
   - API/service name
   - Base URL / endpoint
   - Authentication method
   - Environment variable name(s)
   - Documentation URL
   - Non-secret configuration details
   - NEVER paste passwords or unnecessary secrets into chat.

8. IF ACCESS IS NOT AVAILABLE:
   - Use a mock/sandbox integration when appropriate.
   - Continue development without blocking the phase unnecessarily.
   - Clearly label the integration as MOCK/SANDBOX.
   - Do not claim it is an official government integration.

9. EXTERNAL REGISTRY:
   - Confirm that every new API/URL has been added to:
     config/external-apis.json
     config/external-urls.json
     config/README.md

==================================================
END OUTSIDE WORK
==================================================
```

### Outside Work Rules

Antigravity MUST:

1. Explain outside work in simple step-by-step language.
2. State exactly **which service/API is needed and why**.
3. State the **official website/developer portal** when it is known and verified.
4. Never invent an API, URL, developer portal, endpoint, approval process, or credential requirement.
5. If an official API is unavailable or access is restricted, clearly say so and recommend a mock/sandbox path for the SIH prototype.
6. Never require the user to provide passwords, OTPs, private keys, or other secrets in chat.
7. Tell the user where a credential belongs using the environment variable/configuration name, without asking them to expose the secret value.
8. Distinguish **required now**, **optional**, and **not required yet**.
9. Do not block coding unnecessarily because an external API is unavailable.
10. Keep all external URLs in the central registry.
11. Before introducing a new external service, check whether an existing configured service can be reused.
12. If an external service requires approval, clearly mark the project integration as **PENDING APPROVAL** until authorization is actually obtained.
13. After outside setup is completed, the next phase must still be started only by the user's explicit prompt.

### Phase Completion Order

The complete required order is:

```text
PHASE START
    ↓
Inspect existing project
    ↓
Implement ONLY current phase
    ↓
Test current phase
    ↓
Verify files/configuration
    ↓
Report INSIDE WORK
    ↓
Report OUTSIDE WORK
    ↓
Report APIs / URLs / accounts / credentials needed
    ↓
Report external setup status
    ↓
STOP
    ↓
WAIT FOR USER
    ↓
User completes required outside work
    ↓
User explicitly starts next phase
```

**Antigravity must never silently assume that the user completed outside setup.**

---

# 5. PROJECT DEVELOPMENT PRINCIPLE

Build the project in layers.

```text
Citizen UI
    ↓
Authentication
    ↓
Service Catalog
    ↓
Application Workflow
    ↓
Orchestration Engine
    ↓
API Gateway
    ↓
Integration Adapters
    ↓
Data Standardization
    ↓
Department Systems
    ↓
Tracking / Notifications
    ↓
Analytics / Audit
```

Cross-cutting features:

```text
AI Chatbot
Employment Hub
Scholarship / Scheme / News Hub
Security
Notifications
```

---

# 6. TECHNOLOGY DIRECTION

Use the existing Antigravity project's technology if it already has a working stack.

Do **not** replace the stack unnecessarily.

If the project is starting from scratch, a practical prototype stack is:

### Frontend

- React + Vite, or existing HTML/CSS/JavaScript structure
- Responsive UI
- Reusable components

### Backend

- Node.js
- Express
- REST APIs

### Database

- PostgreSQL or MongoDB

### Integration

- REST/JSON
- API Gateway pattern
- Adapter pattern
- Canonical data model

### Authentication

- Secure session or JWT approach
- OTP can be mocked for SIH prototype

### Chatbot

- LLM API through backend
- Approved knowledge base / RAG
- No secret key in frontend

### Deployment

- Docker where useful
- Cloud/VPS for prototype deployment

---

# 7. MASTER DEVELOPMENT PHASES

## PHASE 1 — Repository Audit & Project Foundation

### Goal

Understand the existing Antigravity project and establish safe project structure.

### Tasks

- Inspect all existing files.
- Identify frontend/backend.
- Identify package manager.
- Identify current routes.
- Identify existing components.
- Identify current API calls.
- Identify current environment variables.
- Identify current database.
- Identify existing authentication.
- Identify reusable UI.
- Do not delete working code.

### Create/verify:

```text
config/
docs/
tests/
.env.example
config/external-apis.json
config/external-urls.json
config/README.md
```

### Deliverables

- Project audit
- Folder structure
- External API registry
- Development rules documented
- Existing code preserved

### OUTSIDE WORK

After implementation, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."

### STOP CONDITION

After verification and the Outside Work report, stop and wait for the next user prompt.

---

# PHASE 2 — UI and Dashboard Foundation

### Goal

Create/organize the unified citizen dashboard without implementing all backend integrations yet.

### Dashboard sections

```text
Dashboard
├── Government Services
├── Application Tracking
├── AI Help
├── Employment
├── Scholarships
├── Government Schemes
├── News & Announcements
├── Notifications
└── Profile
```

### Tasks

- Preserve existing Antigravity design where possible.
- Add navigation.
- Add responsive layout.
- Add service cards.
- Add search.
- Add dashboard summary.
- Add placeholders for integration-dependent data.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test frontend and stop.

---

# PHASE 3 — Authentication & Role Management

### Roles

```text
Citizen
Department Officer
Administrator
```

### Citizen

- Login
- View services
- Apply
- Track
- Download
- Feedback

### Officer

- View assigned applications
- Verify
- Request correction
- Approve/reject

### Admin

- Manage services
- Manage integrations
- View analytics
- View audit logs

### Security

- Password/session handling
- Authorization middleware
- Route protection
- No secrets in frontend

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test role permissions and stop.

---

# PHASE 4 — Service Catalog

### Goal

Create a dynamic government service registry.

Example:

```json
{
  "id": "SCHOLARSHIP_001",
  "name": "Scholarship Application",
  "department": "Education",
  "category": "Education",
  "requiredDocuments": [
    "income_certificate",
    "marksheet"
  ],
  "workflow": [
    "validate",
    "verify",
    "approve"
  ],
  "status": "active"
}
```

### Features

- Search services
- Categories
- Service details
- Eligibility information
- Required documents
- Application action

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Verify service discovery and stop.

---

# PHASE 5 — Unified Application Workflow

### Goal

Allow the citizen to enter information once.

```text
Select Service
    ↓
Unified Form
    ↓
Upload Documents
    ↓
Validation
    ↓
Create Application
    ↓
Application ID
    ↓
Tracking
```

### Required features

- Form validation
- Document metadata
- Application ID
- Draft/submission state
- Error handling

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Complete a full test application and stop.

---

# PHASE 6 — Smart Orchestration Engine

### This is the CORE SIH module.

### Goal

Determine:

- Which department is needed
- Which adapter should be called
- Which data is required
- What order requests should happen
- What happens after each response
- Whether human verification is needed

### Workflow

```text
Application
    ↓
Identify Service
    ↓
Read Workflow Rules
    ↓
Determine Departments
    ↓
Validate Required Data
    ↓
Call Adapter
    ↓
Receive Response
    ↓
Normalize Response
    ↓
Continue Workflow
    ↓
Final Decision
```

### Important

Start with deterministic rules.

Do not allow an AI model to make official government approval decisions.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test at least one complete orchestration flow and stop.

---

# PHASE 7 — API Gateway

### Goal

Create one controlled backend entry point.

### Responsibilities

- Authentication
- Authorization
- Validation
- Routing
- Rate limiting
- Logging
- Error handling

### Example endpoints

```text
GET  /api/v1/services
POST /api/v1/applications
GET  /api/v1/applications/:id
GET  /api/v1/applications/:id/status
POST /api/v1/integrations/:system/verify
GET  /api/v1/notifications
POST /api/v1/feedback
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test successful and failed API requests, then stop.

---

# PHASE 8 — Department Integration Adapter Layer

### Goal

Connect different systems without allowing their formats to spread throughout the application.

```text
Canonical Request
       ↓
Department Adapter
       ↓
External Department API
       ↓
Department Response
       ↓
Adapter
       ↓
Canonical Response
```

### Initial prototype

Use mock APIs if official integrations are unavailable.

Recommended mock systems:

```text
Education
Income
Land
Health
Transport
Scholarship
```

Do not claim mock APIs are official government APIs.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Demonstrate at least two adapter integrations and stop.

---

# PHASE 9 — Data Standardization

### Goal

Create a canonical internal data format.

Example:

```json
{
  "applicationId": "APP-10001",
  "serviceId": "SCHOLARSHIP_001",
  "applicant": {},
  "documents": [],
  "department": "EDUCATION",
  "status": "VERIFICATION_PENDING",
  "timestamps": {}
}
```

### Tasks

- Field mapping
- Date normalization
- Status normalization
- Document type normalization
- Department code normalization

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Show two different mock department formats converted into one common format.

---

# PHASE 10 — Secure Inter-Department Data Exchange

### Goal

Allow only necessary information to be exchanged.

### Required controls

- Authorization
- Minimal data sharing
- API authentication
- Request IDs
- Audit records
- Error handling
- Timeouts
- Retry strategy where safe

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test allowed and unauthorized data access, then stop.

---

# PHASE 11 — Department Officer Workflow

### Officer dashboard

```text
Pending
   ↓
Review
   ↓
Verify
   ↓
Request Correction / Approve / Reject
   ↓
Update Application
   ↓
Citizen Notification
```

### STOP CONDITION

Complete one officer approval and one rejection/correction flow, then stop.

---

# PHASE 12 — Application Tracking

### Timeline

```text
Submitted
   ↓
Pre-validation
   ↓
Routed
   ↓
Verification
   ↓
Processing
   ↓
Approved / Rejected
   ↓
Delivered
```

### Features

- Timeline
- Current status
- Last updated
- Department responsible
- Correction request
- Application history

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Verify that status changes are persisted and displayed correctly.

---

# PHASE 13 — Digital Document Vault

### Goal

Provide controlled access to service documents.

### Features

- Document metadata
- Application reference
- Version
- Timestamp
- Access control
- Download
- Share/verify mechanism where appropriate

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Upload/store/retrieve a test document and stop.

---

# PHASE 14 — Notification System

### Events

```text
APPLICATION_SUBMITTED
STATUS_CHANGED
CORRECTION_REQUIRED
APPLICATION_APPROVED
APPLICATION_REJECTED
NEW_SCHOLARSHIP
NEW_SCHEME
DEADLINE_REMINDER
```

### Channels

Prototype:

```text
Portal Notification
```

Optional:

```text
Email
SMS
```

Keep provider URLs/API settings in the external registry.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Verify notification creation and display.

---

# PHASE 15 — AI Government Help Chatbot

### Goal

Create a government-service assistant.

### Supported tasks

```text
"What services are available?"
"How do I apply for a scholarship?"
"What documents are required?"
"Where can I track my application?"
"What does this status mean?"
"Which scheme matches my requirement?"
```

### Architecture

```text
User
 ↓
Chat UI
 ↓
Backend Chatbot Endpoint
 ↓
Intent / Query Processing
 ↓
Approved Knowledge Base
 ↓
LLM (if used)
 ↓
Grounded Answer
 ↓
Relevant Service / Source
```

### Rules

- API key remains server-side.
- Do not fabricate government information.
- Do not invent deadlines.
- Do not invent eligibility.
- Do not claim an application is approved unless backend data says so.
- Prefer approved/verified information.
- Provide the relevant source or service where available.
- Unsupported questions should receive a safe fallback.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test common government-service questions and unsupported questions, then stop.

---

# PHASE 16 — Employment Hub

### Goal

Provide verified employment information.

### Categories

```text
Government Jobs
Private Opportunities
Apprenticeships
Skill Development
Employment Schemes
Job Notifications
```

### Data fields

```text
title
organization
description
eligibility
location
deadline
category
source
publishedAt
expiresAt
status
```

### Rules

- Do not invent job listings.
- Clearly identify the source.
- Expired opportunities should be hidden or marked expired.
- External source URLs must be stored in the URL registry.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Display and filter employment information successfully.

---

# PHASE 17 — Scholarship / Scheme / News Hub

### Goal

Create a verified information hub.

### Categories

```text
Scholarships
Government Schemes
Announcements
Deadlines
Employment Updates
Service Updates
```

### Each information item should support:

```text
title
category
description
eligibility
deadline
publishedAt
expiresAt
source
officialUrl
status
targetAudience
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Create sample verified records, display them, filter them, and stop.

---

# PHASE 18 — Personalized Information

### Goal

Show more relevant information to users.

Example:

```text
Student
  → Scholarships
  → Education schemes

Job Seeker
  → Employment
  → Skill programs

Farmer
  → Agriculture/welfare information

Business User
  → Business support schemes
```

### Rule

Recommendations can prioritize information but must not replace official eligibility or approval decisions.

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Test at least two profile scenarios and stop.

---

# PHASE 19 — Feedback & Grievance

### Workflow

```text
Citizen
 ↓
Feedback / Grievance
 ↓
Ticket
 ↓
Assignment
 ↓
Resolution
 ↓
Notification
 ↓
Closed
```

### Features

- Category
- Description
- Ticket ID
- Status
- Assigned team
- Response
- Resolution
- Rating

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Complete one test grievance from creation to closure.

---

# PHASE 20 — Admin Dashboard & Analytics

### Metrics

```text
Total applications
Pending applications
Approved applications
Rejected applications
Average processing time
Service usage
Integration errors
Chatbot usage
Employment views
Information hub views
Grievances
```

### Integration monitoring

```text
API status
Response time
Error rate
Timeouts
Last successful request
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Verify dashboard metrics against test data.

---

# PHASE 21 — Audit & Security Hardening

### Audit events

```text
LOGIN
LOGOUT
APPLICATION_CREATED
APPLICATION_UPDATED
DOCUMENT_ACCESSED
INTEGRATION_REQUEST
INTEGRATION_RESPONSE
APPROVAL
REJECTION
ADMIN_CHANGE
```

### Security checklist

- HTTPS in deployment
- Authentication
- Authorization
- Input validation
- File validation
- Rate limiting
- Secure headers
- Secret management
- No API keys in frontend
- Minimal personal data storage
- Audit logging
- Error messages must not leak secrets
- Dependency review

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Run security checks and stop.

---

# PHASE 22 — Testing & Failure Simulation

Test:

```text
Normal application
Invalid form
Missing document
Unauthorized access
Expired session
External API timeout
External API failure
Malformed external response
Duplicate request
Chatbot unsupported question
Expired news item
Expired employment listing
Notification failure
```

### Integration failure behavior

```text
External API
    ↓
Timeout / Error
    ↓
Log error
    ↓
Retry only when safe
    ↓
Update application state
    ↓
Show meaningful message
    ↓
Allow recovery
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


All critical test cases pass or are documented as known issues.

---

# PHASE 23 — Performance & Optimization

### Check

- Page load
- API response time
- Database queries
- Duplicate API requests
- Caching opportunities
- Large file handling
- Chatbot request efficiency
- External API timeouts

### Credit-efficiency requirement

Do not repeatedly call external APIs when cached verified data is sufficient.

Use caching for suitable non-sensitive information such as:

```text
Government news
Scholarship announcements
Employment listings
Service catalog
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Optimize only measurable bottlenecks and stop.

---

# PHASE 24 — Deployment

### Target

```text
User
 ↓
Frontend
 ↓
Backend/API
 ↓
Database
 ↓
Integration Layer
 ↓
External Systems
```

### Deployment requirements

- Environment variables
- Production API URLs
- HTTPS
- Database backup strategy
- Logs
- Health checks
- Error monitoring
- Secure secret storage

### Before deployment

Verify:

```text
.env is not committed
API keys are not in frontend
External URLs are registered
Database connection works
Health endpoint works
Frontend connects to correct backend
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


Deploy and verify the production/demo environment, then stop.

---

# PHASE 25 — SIH Demo Preparation

## Recommended demo story

Use one complete citizen journey.

```text
Citizen Login
      ↓
Dashboard
      ↓
Scholarship update appears
      ↓
Citizen asks chatbot
      ↓
Chatbot explains scholarship
      ↓
Citizen opens service
      ↓
Unified form
      ↓
Documents
      ↓
Pre-validation
      ↓
Smart Orchestration
      ↓
API Gateway
      ↓
Education Adapter
      ↓
Income Adapter
      ↓
Data Standardization
      ↓
Department Verification
      ↓
Approval
      ↓
Notification
      ↓
Application Tracking
      ↓
Digital Document
      ↓
Feedback
      ↓
Admin Analytics
```

Then show:

```text
Employment Hub
      +
Scheme / Scholarship / News Hub
```

This demonstrates that the platform is both:

```text
TRANSACTIONAL
+
INFORMATIONAL
+
INTEROPERABLE
```

### STOP CONDITION

### OUTSIDE WORK REPORT

Before stopping, provide the mandatory Outside Work / External Setup Checklist. If nothing is needed, explicitly state: "No outside work required for this phase."


After preparing the demo, stop.

---

# 8. FINAL END-TO-END FLOW

```text
                         CITIZEN
                            |
                            v
                     SECURE LOGIN
                            |
                            v
                   UNIFIED DASHBOARD
                            |
          +-----------------+------------------+
          |                 |                  |
          v                 v                  v
    GOVERNMENT          AI CHATBOT       INFORMATION HUB
     SERVICES                              |
          |                         +------+------+
          |                         |             |
          |                    EMPLOYMENT    SCHOLARSHIPS
          |                         |         SCHEMES / NEWS
          |                         |             |
          +------------+------------+-------------+
                       |
                       v
                SERVICE DISCOVERY
                       |
                       v
               UNIFIED APPLICATION
                       |
                       v
                DATA VALIDATION
                       |
                       v
             SMART ORCHESTRATION
                       |
                       v
                  API GATEWAY
                       |
          +------------+-------------+
          |            |             |
          v            v             v
      EDUCATION      HEALTH        LAND
       ADAPTER       ADAPTER      ADAPTER
          |            |             |
          +------------+-------------+
                       |
                       v
             DATA STANDARDIZATION
                       |
                       v
          SECURE DATA EXCHANGE
                       |
                       v
             DEPARTMENT PROCESSING
                       |
                 +-----+-----+
                 |           |
                 v           v
              APPROVED    REJECTED
                 |           |
                 v           v
          SERVICE RESULT   REASON /
                 |         CORRECTION
                 v
          DIGITAL DOCUMENT
                 |
                 v
             NOTIFICATION
                 |
                 v
          APPLICATION TRACKING
                 |
                 v
          DOWNLOAD / VERIFY
                 |
                 v
          FEEDBACK / GRIEVANCE
                 |
                 v
          ADMIN + ANALYTICS
                 |
                 v
          AUDIT + MONITORING
                 |
                 v
        CONTINUOUS IMPROVEMENT
```

---

# 9. Definition of Done

The project is considered complete only when:

- [ ] Citizen can log in
- [ ] Citizen can discover services
- [ ] Citizen can submit a unified application
- [ ] Application receives an ID
- [ ] Validation works
- [ ] Smart orchestration works
- [ ] API Gateway works
- [ ] At least two department adapters work in prototype
- [ ] Data is standardized
- [ ] Department officer can process application
- [ ] Citizen can track status
- [ ] Notification works
- [ ] Document vault works
- [ ] AI chatbot works with grounded information
- [ ] Employment Hub works
- [ ] Scholarship/Scheme/News Hub works
- [ ] Personalized information works
- [ ] Feedback/grievance works
- [ ] Admin dashboard works
- [ ] Audit logs work
- [ ] External URLs are centrally stored
- [ ] API secrets are not exposed
- [ ] `.env` is not committed
- [ ] Critical tests pass
- [ ] SIH demo journey works end-to-end
- [ ] Documentation is complete
- [ ] Outside-work requirements and external setup documentation are complete
- [ ] All external services/URLs are recorded in the central registry

---

# 10. Required Antigravity Response After Every Phase

At the end of every phase, Antigravity should respond using this structure:

```text
PHASE: [number and name]

STATUS: COMPLETED / BLOCKED

COMPLETED:
- ...
- ...
- ...

FILES CHANGED:
- ...
- ...

TESTS:
- ...
- ...

ISSUES:
- None
OR
- ...

EXTERNAL APIs / URLs ADDED:
- ...
OR
- None

OUTSIDE WORK — USER MUST DO:
- Status: Required / Optional / No outside work required
- Service/API:
- Official website/developer portal:
- Login/registration:
- API access/credentials:
- URLs/endpoints:
- Configuration location:
- Approval required:
- What user should bring back:
- External registry updated: YES / NO

If no outside work is required:
- Clearly write: "No outside work required for this phase."

NEXT PHASE:
[Do not start automatically]

WAITING FOR USER PROMPT.
```

**The last line is mandatory.**

Antigravity must stop after this response.

---

# 11. Outside Work Confirmation

When a phase reports required outside work, the user should complete that setup before starting the next phase where the setup is necessary.

The user does **not** need to paste secret values into Antigravity/chat. Instead, the user should configure the secret locally in `.env` or the approved secret manager and tell Antigravity only that the configuration is ready.

Example:

```text
Outside work completed:
- Developer account created: YES
- API access approved: YES
- API configured in .env: YES
- External URL registered: YES
- Secret values shared in chat: NO

Start Phase 8 only.
Follow PLAN.md strictly.
Complete Phase 8, verify it, report INSIDE WORK and OUTSIDE WORK, then STOP.
Do not start Phase 9 automatically.
```

---

# 12. Prompting Strategy for the User

Use one prompt per phase.

Example:

```text
Start Phase 1 only.

Follow PLAN.md strictly.

Complete Phase 1, verify it, report the result, and STOP.
Do not start Phase 2 automatically.
```

Then after reviewing the result:

```text
Start Phase 2 only.

Follow PLAN.md strictly.

Complete Phase 2, verify it, report the result, and STOP.
Do not start Phase 3 automatically.
```

Continue this pattern for every phase.

---

# 13. Golden Rules

These rules override convenience during development:

1. **Never skip a phase gate.**
2. **Never automatically start the next phase.**
3. **Never waste credits rebuilding working code.**
4. **Inspect before editing.**
5. **Reuse existing code whenever possible.**
6. **Keep external URLs centralized.**
7. **Keep API secrets out of frontend and Git.**
8. **Use mock APIs when official access is unavailable.**
9. **Clearly label mock integrations.**
10. **Do not fabricate government data, jobs, schemes, scholarships or deadlines.**
11. **AI assists citizens; it does not make official government approval decisions.**
12. **Test each phase before stopping.**
13. **Do not modify unrelated features.**
14. **Keep the application modular so new departments can be added through adapters.**
15. **Preserve a clear audit trail for important actions.**
16. **After every phase, clearly report all required outside work.**
17. **Tell the user which APIs, URLs, accounts, portals, credentials/configuration and approvals are needed.**
18. **Never invent external URLs or integration requirements.**
19. **Never ask the user to share passwords, OTPs, private keys, or secret credential values.**
20. **Use mock/sandbox services when official access is unavailable, and label them clearly.**
21. **Do not assume outside work is complete; wait for explicit user confirmation/next-phase prompt.**

---

# 14. Final Architecture Principle

The platform should be designed so that adding a new government department looks like:

```text
NEW DEPARTMENT
      |
      v
Register Department
      |
      v
Register Service
      |
      v
Create Adapter
      |
      v
Map Department Data
      |
      v
Define Workflow
      |
      v
Test Integration
      |
      v
AVAILABLE THROUGH
UNIFIED PORTAL
```

The citizen should not need to understand the complexity behind the integration.

The complexity belongs inside the interoperability layer.

---

# 15. Final SIH Statement

> The proposed platform creates a unified citizen experience over fragmented government digital systems. Instead of replacing existing departmental platforms, it provides a secure interoperability layer using API gateways, adapters, standardized data models and smart workflow orchestration. Alongside transactional services, the platform provides AI-assisted guidance, employment information, scholarships, government schemes and verified announcements, making government services easier to discover, access, track and understand.

