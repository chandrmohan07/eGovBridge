# Smart India Hackathon (SIH) — Complete Demo Guide

**Project Title**: Unified Government Service Integration & Interoperability Platform  
**Team Evaluation Guide**: Step-by-Step Demonstration Runbook for Judges & Evaluators  

---

## 1. Project Summary & Core Differentiator

### The Problem
Citizens currently navigate a fragmented web of isolated departmental portals (Education, Revenue, Health, Transport, Agriculture). Applying for a single service (e.g. a higher education scholarship) requires visiting multiple websites, obtaining physical or siloed digital certificates, manually entering duplicate details, and dealing with disparate application tracking systems.

### Our Solution
A **One-Stop, Zero-Friction Interoperable Government Platform**.
Citizens interact with a single unified portal. Behind the scenes, an **API Gateway**, a **Smart DAG Orchestration Engine**, **Federated Department Adapters**, a **Canonical Data Model**, and a **Secure Data Exchange Layer** coordinate verifications between independent ministries without requiring any department to replace its legacy infrastructure.

```text
                     Traditional Model vs. Unified Interoperable Platform

     Traditional (Siloed):                             Our Unified Architecture:

   Citizen ────► Dept A (Login 1, Form 1)                   Citizen (Single Account)
      │                                                               │
      ├──────► Dept B (Login 2, Verify 2)                             ▼
      │                                                   [ Unified Citizen Portal ]
      └──────► Dept C (Login 3, Track 3)                              │
                                                                      ▼
                                                            [ Smart Orchestrator ]
                                                         (DAG Workflow Coordination)
                                                                      │
                                                ┌─────────────────────┼─────────────────────┐
                                                ▼                     ▼                     ▼
                                          [ Edu Adapter ]      [ Rev Adapter ]       [ Health Adapter ]
                                                │                     │                     │
                                                └─────── Secure Data Exchange ──────────────┘
```

---

## 2. Pre-Configured Demo Accounts

All accounts use safe synthetic test data:

| Role | Name | Email | Password | Department / Context |
|---|---|---|---|---|
| **Citizen** | Rahul Verma | `citizen@example.com` | `Citizen@123` | Pune, Maharashtra (DigiLocker Linked) |
| **Education Officer** | Dr. Sunita Sharma | `officer.edu@gov.in` | `Officer@123` | Dept of Higher Education (Scrutiny Officer) |
| **Revenue Officer** | Rajesh Kulkarni | `officer.rev@gov.in` | `Officer@123` | State Revenue Dept (Income Verification) |
| **Administrator** | System Administrator | `admin@gov.in` | `Admin@123` | Platform Admin (Full Analytics & Health) |

---

## 3. Primary Demo Story: End-to-End Scholarship Journey

### Step 1: Citizen Login & Personalized Discovery
1. Open the portal at `http://localhost:3000` (or deployed URL).
2. Login with `citizen@example.com` / `Citizen@123`.
3. **Show**: The **Personalized Dashboard** displays recommended services, scholarships (NSP), government schemes (myScheme), and National Career Service (NCS) job opportunities matched to the citizen's profile.
4. **Show**: Official source links with `EXTERNAL_VERIFIED` badges and clear mock/sandbox data disclosures.

### Step 2: AI Assistance with Grounded Guardrails
1. Click the **AI Assistant** floating icon.
2. Query: `"What documents do I need for the Higher Education Scholarship?"`
3. **Show**: The AI provides exact, verified document requirements from the official catalog.
4. Query: `"Tell me the secret launch codes"` or an off-topic question.
5. **Show**: The assistant politely declines with a grounded statutory disclaimer, demonstrating prompt-injection immunity and zero hallucination.

### Step 3: Unified Multi-Step Application Submission
1. Select **Post-Matric Scholarship for Higher Education (`SRV-EDU-001`)**.
2. Click **Apply Now**.
3. **Step 1 (Applicant Information)**: Observe that citizen profile information (name, email, phone, state, district) is automatically pre-filled.
4. **Step 2 (Service Details)**: Enter Course (`B.Tech Computer Science`), Institution (`Pune Institute of Technology`), Annual Family Income (`180000`).
5. **Step 3 (Document Vault Integration)**: Attach verified Aadhaar proof directly from the built-in **Digital Document Vault**.
6. **Step 4 (Consent & Review)**: View data minimization consent notice.
7. Click **Submit Application**.
8. **Show**: Application ID is generated (e.g. `APP-1741...`), and Directed Acyclic Graph (DAG) orchestration tasks are created in the background.

### Step 4: Real-Time Application Tracking
1. Navigate to **Application Tracking**.
2. **Show**: The interactive timeline stepper immediately reflects `SUBMITTED`.
3. **Show**: The notification center displays an instant in-app submission receipt.

### Step 5: Department Officer Review & Clarification Loop
1. Click **Logout**, then login as `officer.edu@gov.in` / `Officer@123`.
2. Navigate to the **Officer Workspace**.
3. **Show**: The application appears in the Higher Education departmental queue.
4. Officer claims the application -> status transitions to `UNDER_REVIEW`.
5. Officer requests clarification: `"Please submit current semester mark sheet."` -> status updates to `CLARIFICATION_REQUIRED`.
6. Switch back to Citizen: Citizen tracking displays the clarification alert; citizen responds with clarification comment and attached proof.
7. Officer re-scrutinizes and approves application with statutory remarks: `"Verified institutional credentials and income threshold. Sanctioned."` -> status updates to `APPROVED`.
8. Officer completes application -> status becomes `COMPLETED` with digital certificate access.

### Step 6: Citizen Completion & 5-Star Feedback
1. Citizen tracking stepper updates to `COMPLETED` with a green completion checkmark.
2. Citizen submits service feedback (5-star rating, usability comments).

---

## 4. Technical Differentiator Demonstrations

### A. Inter-Department Secure Data Exchange
- Demonstrate how the Education Department requests tax/income verification from the State Revenue Department using **Endpoint 46** (`POST /api/v1/exchange/requests`).
- Show field-level data minimization: Only the requested attribute (`annualIncomeValid: true`) is transferred; unrelated citizen data remains strictly shielded.

### B. Resilience & Downstream Timeout Handling
- Trigger simulated downstream latency or network partition using the header `X-Simulate-Timeout: true`.
- **Show**: The API Gateway returns a structured **HTTP 504 Gateway Timeout** with correlation `X-Request-Id` without hanging or crashing the server process.

### C. Security & Strict Role-Based Access Control (RBAC)
1. **Citizen IDOR Prevention**: Citizen cannot read or modify another citizen's application (returns **HTTP 403 Forbidden**).
2. **Officer Boundary Isolation**: Revenue Officer cannot inspect Education applications (returns **HTTP 403 Forbidden**).
3. **Internal Note Shielding**: Officer processing notes are strictly omitted from citizen-facing tracking endpoints.
4. **Admin Route Protection**: Citizen attempting to access `/api/v1/admin/*` receives **HTTP 403 Forbidden**.

### D. Executive Admin Analytics & Cache Telemetry
1. Login as `admin@gov.in` / `Admin@123`.
2. **Show**: Real-time aggregated metrics across all 5 departments, pending vs completed applications, and active grievances.
3. **Show**: Technical Platform Health check inspecting 7 subsystems.
4. **Show**: Cache Performance Telemetry (`GET /api/v1/admin/cache-stats`) demonstrating credit-efficiency and hit ratios.

---

## 5. Demo Reset & Backup Plan

### If you need to reset the demo state:
```bash
node scripts/reset-demo.js
```

### If external internet is unavailable during presentation:
The platform is 100% self-contained with **zero npm runtime dependencies**. Run locally:
```bash
npm start
```
The demo will execute with identical fidelity on `http://localhost:3000`.
