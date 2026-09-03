# Unified Government Service Integration Platform — Architecture Specification

This document details the architectural topology, data flows, security boundaries, and modular subsystems of the platform.

---

## 1. High-Level Architectural Topology

```text
                               ┌─────────────────────────────────────────┐
                               │             CITIZEN CLIENT              │
                               │  (Responsive Web App / Vanilla JS Store)│
                               └────────────────────┬────────────────────┘
                                                    │ HTTPS / REST
                                                    ▼
 ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 ║                                 API GATEWAY LAYER                                         ║
 ║  • Security Headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff)   ║
 ║  • Request ID Tracing (X-Request-Id Correlation)                                         ║
 ║  • Rate Limiting (120 req/min Sliding Window)                                            ║
 ║  • Timeout Protection (10s SLA Fallback)                                                 ║
 ║  • In-Memory TTL Cache (ETag Weak Hashing / HTTP 304 Conditional Responses)               ║
 ╚══════════════════════════════════════════╤════════════════════════════════════════════════╝
                                            │ Dispatched Route Context
                                            ▼
 ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 ║                              CORE INTEGRATION PLATFORM                                    ║
 ║                                                                                           ║
 ║   ┌──────────────────────────┐                   ┌──────────────────────────────────┐     ║
 ║   │  AUTHENTICATION & RBAC   │                   │    SMART ORCHESTRATION ENGINE    │     ║
 ║   │  • Salted Scrypt Hashes  │                   │    • Directed Acyclic Graph      │     ║
 ║   │  • Citizen/Officer/Admin │                   │    • Task Dependency Resolver    │     ║
 ║   │  • Fine-Grained Scopes   │                   │    • Retry & Backoff Controller  │     ║
 ║   └─────────────┬────────────┘                   └────────────────┬─────────────────┘     ║
 ║                 │                                                 │                       ║
 ║                 ▼                                                 ▼                       ║
 ║   ┌──────────────────────────┐                   ┌──────────────────────────────────┐     ║
 ║   │   CANONICAL DATA MODEL   │◄─────────────────►│   FEDERATED DEPARTMENT ADAPTERS  │     ║
 ║   │   • Standard JSON Schemas│                   │   • EducationAdapter             │     ║
 ║   │   • Bidirectional Mappers│                   │   • RevenueAdapter               │     ║
 ║   │   • Validation Engine    │                   │   • HealthAdapter                │     ║
 ║   └──────────────────────────┘                   │   • LandRecordsAdapter           │     ║
 ║                 │                                │   • TransportAdapter             │     ║
 ║                 ▼                                └────────────────┬─────────────────┘     ║
 ║   ┌──────────────────────────┐                                    │                       ║
 ║   │  SECURE DATA EXCHANGE    │◄───────────────────────────────────┘                       ║
 ║   │  • Field Minimization    │                                                            ║
 ║   │  • Purpose Authorization │                                                            ║
 ║   │  • Department Isolation  │                                                            ║
 ║   └──────────────────────────┘                                                            ║
 ╚══════════════════════════════════════════╤════════════════════════════════════════════════╝
                                            │
                                            ▼
 ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 ║                                  SUBSYSTEM SERVICES                                       ║
 ║                                                                                           ║
 ║   ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐    ║
 ║   │ DIGITAL VAULT        │  │ NOTIFICATION SERVICE │  │ GROUNDED AI CHATBOT          │    ║
 ║   │ • 5 MB Size Cap      │  │ • Real-Time In-App   │  │ • Catalog-Grounded Assistant │    ║
 ║   │ • Whitelisted MIME   │  │ • Event Subscriptions│  │ • Injection Resistance       │    ║
 ║   │ • IDOR Isolation     │  │ • Preferences Engine │  │ • Statutory Disclaimers      │    ║
 ║   └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘    ║
 ║                                                                                           ║
 ║   ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐    ║
 ║   │ INFORMATION HUBS     │  │ GRIEVANCE & FEEDBACK │  │ ADMIN DASHBOARD & ANALYTICS  │    ║
 ║   │ • NCS Employment     │  │ • Ticket Lifecycle   │  │ • Executive Summary          │    ║
 ║   │ • NSP Scholarships   │  │ • Officer Investigation│ • Platform Subsystem Health  │    ║
 ║   │ • myScheme Welfare   │  │ • Star Ratings       │  │ • Centralized Audit Trail    │    ║
 ║   │ • PIB Announcements  │  │ • Redressal SLA      │  │ • Non-Sensitive JSON Export  │    ║
 ║   └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘    ║
 ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. End-to-End Application Lifecycle Workflow

```text
 1. Citizen Form Submission
        │
        ▼
 2. API Gateway (Rate Limit & Input Validation)
        │
        ▼
 3. Orchestration Engine (DAG Generation)
        ├──────────────────────────────────────────────────┐
        ▼                                                  ▼
 4a. Task 1: Identity & Enrollment Check            4b. Task 2: Income Eligibility Verification
     (EducationAdapter)                                 (RevenueAdapter via Secure Data Exchange)
        │                                                  │
        └─────────────────────────┬────────────────────────┘
                                  │ Both Tasks Complete Successfully
                                  ▼
 5. Task 3: Officer Scrutiny Assignment
        │
        ▼
 6. Department Officer Claim & Approval (with Statutory Remarks)
        │
        ▼
 7. Status Updates to COMPLETED (Digital Certificate Issued)
        │
        ▼
 8. Real-Time Timeline Stepper & In-App Notification Delivery
```

---

## 3. Department Isolation & Boundary Matrix

| Actor / Client | Citizen Data | Own Dept Applications | Foreign Dept Applications | Audit Logs | Vault Uploads |
|---|:---:|:---:|:---:|:---:|:---:|
| **Citizen (Owner)** | Read/Write (Self) | Read (Own Only) | Read (Own Only) | None | Full (Own Only) |
| **Citizen (Other)** | Forbidden (403) | Forbidden (403) | Forbidden (403) | None | Forbidden (403) |
| **Education Officer** | Read (Linked) | Read/Write (Queue) | Forbidden (403) | Department Only | Download Linked |
| **Revenue Officer** | Read (Linked) | Read/Write (Queue) | Forbidden (403) | Department Only | Download Linked |
| **Administrator** | Aggregated Read | Full Audit View | Full Audit View | Read/Export | Audit Telemetry |

---

## 4. Key Subsystem Metrics

- **Zero Runtime npm Dependencies**: Operates strictly on Node.js 20 LTS standard libraries.
- **Sub-Millisecond Response Time**: Gateway and core routes average ~0.3 ms.
- **Resource Footprint**: RSS ~55 MB, Heap Used ~9.8 MB.
- **Verified Integrity**: 499 automated test cases across 91 test suites.
