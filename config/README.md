# External API & URL Registry

This directory serves as the **single source of truth** for all external integration targets, API configurations, public data sources, and service endpoints in accordance with **PLAN.md Rule 3 (Central External Configuration)** and **PLAN.md Rule 4 (Outside Work / External Setup Checklist)**.

---

## 1. Registered External APIs & Integration Endpoints

All external API configurations are registered in [`external-apis.json`](./external-apis.json). Secrets and base URLs are resolved through environment variables and **never** hardcoded.

| Name | Purpose | URL/Env Variable | Auth Method | Used By | Mode / Status |
|---|---|---|---|---|---|
| **Education API** | Academic credentials & enrollment verification | `EDUCATION_API_URL` | Token (`EDUCATION_API_KEY`) | Education Adapter (Phase 8) | Mock / Sandbox |
| **Income API** | Income certificate verification for scholarships | `INCOME_API_URL` | Token (`INCOME_API_KEY`) | Revenue Adapter (Phase 8) | Mock / Sandbox |
| **Scholarship API** | Scholarship eligibility check & submission | `SCHOLARSHIP_API_URL` | Token (`SCHOLARSHIP_API_KEY`) | Scholarship Adapter (Phase 8) | Mock / Sandbox |
| **Health API** | Beneficiary & health scheme verification | `HEALTH_API_URL` | Token (`HEALTH_API_KEY`) | Health Adapter (Phase 8) | Planned |
| **Land API** | Land holding & agricultural verification | `LAND_API_URL` | Token (`LAND_API_KEY`) | Land Adapter (Phase 8) | Planned |
| **Transport API** | Driving license & vehicle verification | `TRANSPORT_API_URL` | Token (`TRANSPORT_API_KEY`) | Transport Adapter (Phase 8) | Planned |
| **Chatbot LLM Gateway** | Grounded citizen assistant query completion | `CHATBOT_API_URL` | API Key (`LLM_API_KEY`) | AI Chatbot Service (Phase 15) | Planned |

---

## 2. Registered Official Public URLs & Sources

All public portal references are registered in [`external-urls.json`](./external-urls.json). These are non-secret, verified official government portals.

| Source Name | Purpose | Verified Portal URL | Status | Last Verified |
|---|---|---|---|---|
| **National Scholarship Portal (NSP)** | Central scholarship listings & schemes | `https://scholarships.gov.in` | Verified Public Portal | 2026-09-03 |
| **myScheme National Platform** | National scheme catalog & eligibility rules | `https://www.myscheme.gov.in` | Verified Public Portal | 2026-09-03 |
| **National Career Service (NCS)** | Official government jobs & apprenticeships | `https://www.ncs.gov.in` | Verified Public Portal | 2026-09-03 |
| **Press Information Bureau (PIB)** | Official Government of India announcements | `https://pib.gov.in` | Verified Public Portal | 2026-09-03 |

---

## 3. Configuration & Security Rules

1. **Zero Secret Exposure**:
   - Never commit `.env` to Git.
   - Never expose API keys, client secrets, tokens, or private endpoints in frontend JavaScript, React bundles, HTML, or mock seeds.
   - All external API communication MUST be routed through the server-side API Gateway / Adapters.
2. **Central Registration Mandate**:
   - No external URL or service endpoint may be introduced into code without first registering it in `external-apis.json` or `external-urls.json` and documenting it here in `config/README.md`.
3. **Mock / Sandbox Prototype Policy**:
   - For any official government API where live production access is restricted or pending formal government clearance, implement a clearly-labeled local mock adapter.
   - Mock adapters adhere to real-world canonical schemas and must never claim to be official live government services.
4. **Environment Variable Parity**:
   - Every variable referenced in `external-apis.json` must have a corresponding safe placeholder in `.env.example`.
