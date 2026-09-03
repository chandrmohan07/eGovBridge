# Smart India Hackathon (SIH) — Timed Presentation Scripts

This document provides presentation scripts tailored for **5-Minute**, **10-Minute**, and **15-Minute** judging evaluation slots.

---

## 1. Five-Minute Presentation Script (Elevator Pitch & Live Demo)

| Timestamp | Screen / Visual | Speaker Script & Action |
|---|---|---|
| **0:00 – 0:30** | Slide / Landing Page | *"Respected judges, today an Indian citizen applying for a college scholarship must visit 3 different portals: State Revenue for income proofs, DigiLocker or a local office for caste, and National Scholarship Portal for submission. We present the Unified Government Service Integration Platform: One citizen login, many independent ministries, and zero duplicate forms."* |
| **0:30 – 1:30** | Citizen Portal | *"Here is our citizen, Rahul Verma. Upon logging in, his personalized dashboard matches him with relevant scholarships and schemes. Notice the AI Assistant: when he asks for requirements, it provides grounded information strictly from official catalogs, with zero hallucination. He clicks Apply on the Post-Matric Scholarship; his personal details are pre-filled, and verified identity proofs attach directly from his Digital Document Vault."* |
| **1:30 – 2:30** | Submission & Tracking | *"With one click, Rahul submits. Watch what happens: our API Gateway routes the payload into a Directed Acyclic Graph (DAG) Orchestrator. The orchestrator decomposes the application into micro-tasks across Higher Education and State Revenue. Meanwhile, Rahul's interactive timeline stepper immediately reflects 'SUBMITTED' with real-time status updates."* |
| **2:30 – 3:30** | Officer Workspace | *[Switch tab to Officer]* *"Now we log in as Dr. Sunita Sharma, Higher Education Scrutiny Officer. She sees only applications for her department. She claims Rahul's application—updating his status to 'UNDER_REVIEW'—and triggers an automated cross-department income verification via our Secure Data Exchange. Once verified, she approves with statutory remarks."* |
| **3:30 – 4:30** | Admin Analytics & Tech | *[Switch tab to Admin]* *"Finally, as System Administrator, we see live platform analytics across all 5 departments, real-time subsystem health, and cache performance metrics. Most importantly: this platform has ZERO external runtime npm dependencies, uses PBKDF2/scrypt password hashing, and enforces strict field-level data minimization."* |
| **4:30 – 5:00** | Conclusion & Q&A | *"One unified interface for citizens, zero disruption to legacy department systems. Thank you, and we look forward to your questions!"* |

---

## 2. Ten-Minute Standard Hackathon Evaluation Script

| Timestamp | Section | Key Talking Points & Actions |
|---|---|---|
| **0:00 – 1:30** | **The Core Problem** | Highlight the "portal fatigue" and bureaucratic silos. Explain why existing portals fail: they require citizens to act as the human integration glue between ministries. Introduce our vision: citizen-centric abstraction on top of federated departmental systems. |
| **1:30 – 3:30** | **Citizen Journey** | - Login as `citizen@example.com`.<br>- Show **Personalized Dashboard**: recommendations powered by profile matching.<br>- Show **Grounded AI Assistant**: demonstrate valid response vs. prompt injection refusal.<br>- Open **Scholarship Application**: multi-step form pre-filled, vault document attached.<br>- Submit application: observe generated ID and tracking timeline. |
| **3:30 – 5:30** | **Orchestration & Interoperability** | - Explain the **Smart DAG Orchestration Engine** (Phase 6): applications aren't static rows; they are dependency graphs.<br>- Demonstrate **Federated Department Adapters** (Education, Revenue, Health).<br>- Demonstrate **Secure Inter-Department Exchange** (Phase 10): Education requests Revenue income verification without exposing unrelated citizen details. |
| **5:30 – 7:30** | **Department Officer Processing** | - Login as `officer.edu@gov.in`.<br>- Department queue isolation (Education Officer cannot see Revenue applications).<br>- Demonstrate **Clarification Loop**: Officer requests proof -> Citizen tracking reflects `CLARIFICATION_REQUIRED` -> Citizen uploads proof -> Officer sanctions application. |
| **7:30 – 9:00** | **Security & Technical Architecture** | - Demonstrate IDOR protection: Citizen 2 blocked from Citizen 1 files (HTTP 403).<br>- Show rate limiting and timeout protection (HTTP 504 on slow downstream services).<br>- In-memory TTL cache with ETag/304 conditional responses.<br>- 499 passing automated tests verifying all 24 phases. |
| **9:00 – 10:00** | **Impact & Future Roadmap** | Scalability to state/central portals, DigiLocker integration readiness, and summary. |

---

## 3. Fifteen-Minute Deep-Dive Evaluation Script

| Timestamp | Phase / Focus | Action & Demonstration Details |
|---|---|---|
| **0:00 – 2:00** | **Context & Problem Statement** | Executive pitch on digital public infrastructure (DPI), interoperability challenges, and citizen friction. |
| **2:00 – 5:00** | **Live Citizen Walkthrough** | Complete registration, personalized scheme recommendations, grounded chatbot, multi-step application, and vault attachment. |
| **5:00 – 8:00** | **Department Workflow & Redressal** | Scrutiny, clarification exchange, statutory approval, certificate generation, and grievance registration. |
| **8:00 – 10:30** | **Integration & Resilience Demo** | Live demonstration of DAG task dependencies, inter-department data minimization exchange, and simulated timeout fallback (HTTP 504). |
| **10:30 – 12:30** | **Security, RBAC & Audit Trail** | Live inspection of `GET /api/v1/admin/audit-logs`, redaction of sensitive parameters, CSP headers, and RBAC denial assertions. |
| **12:30 – 15:00** | **Judges' Questions & Discussion** | Live answers using the pre-compiled [`SIH_QA.md`](./SIH_QA.md) framework. |
