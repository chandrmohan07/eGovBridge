# Phase 15 — AI Government Help Chatbot

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 15  
**Safety & Prompt Injection Guard**: [`server/chatbot/safety.js`](../server/chatbot/safety.js)  
**Knowledge Base Engine**: [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js)  
**AI Provider Abstraction**: [`server/chatbot/providers/ai-provider.js`](../server/chatbot/providers/ai-provider.js)  
**Chatbot Service**: [`server/chatbot/chatbot-service.js`](../server/chatbot/chatbot-service.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**Frontend UI Component**: [`public/js/components/AIHelp.js`](../public/js/components/AIHelp.js)

---

## 1. Overview & Objective

Phase 15 implements the **AI Government Help Chatbot**, an assistive layer providing citizens with grounded, verified guidance on available government services, eligibility criteria, mandatory documents, application procedures, lifecycle tracking, and status explanations.

```text
Citizen / Guest
      ↓
Chatbot API Gateway (/api/v1/chatbot)
      ↓
Safety & Prompt Injection Guard (Rejects jailbreaks & credential leaks)
      ↓
Chatbot Service & Session Manager
      ↓
Grounded Knowledge Base
  ├── 1. Canonical Service Catalog (Services, Departments, SLAs, Fees)
  ├── 2. Configured Document Types (Categories & accepted MIME formats)
  ├── 3. Authenticated Citizen Applications (Strict ownership scope)
  └── 4. Official Portal Guidelines & FAQs (myScheme, NSP, DigiLocker)
      ↓
AI Provider Abstraction
  ├── Primary: Grounded MockAIProvider (Zero hallucinations, fast, deterministic)
  └── Extensible: Server-Side LLMProvider (Planned Gov AI Gateway)
      ↓
Grounded Response with Official Source Attribution & Action Shortcuts
```

---

## 2. Architectural Principles & Safety Rules

1. **Non-Decision Authority**:
   - The chatbot acts strictly as an informational and navigation assistance layer.
   - It is programmatically prevented from issuing official statutory determinations (e.g. approving, rejecting, or certifying documents).
   - Official decisions are legally reserved exclusively for authorized Department Officers.
2. **Zero Hallucination Policy**:
   - The assistant only answers using verified data cataloged in the trusted database.
   - If information is not available in official project data, it produces a safe fallback advising the citizen to consult official national portals (`myScheme.gov.in`, `scholarships.gov.in`).
3. **Strict Data Privacy & Minimization**:
   - Citizens can only query their own application records (`app.applicantId === user.id`).
   - Querying another citizen's application ID triggers an immediate Access Denied refusal.
   - Passwords, hashes, salts, session tokens, and private internal officer notes are completely stripped from AI context.

---

## 3. Prompt Injection & Security Guards

Located in [`server/chatbot/safety.js`](../server/chatbot/safety.js):
- **Jailbreak / Injection Defense**: Rejects instructions attempting to override system behavior (*"Ignore previous instructions"*, *"Reveal system prompt"*, *"Show database passwords"*).
- **Decision Command Defense**: Rejects attempts to command official determinations (*"Approve my application now"*, *"Certify this document valid"*).
- **Input Validation**: Rejects empty payloads and strings exceeding 1000 characters.
- **Rate Limiting**: Enforces a limit of 30 requests per minute per user/session to prevent automated resource exhaustion.

---

## 4. Grounded Knowledge Base

Located in [`server/chatbot/knowledge-base.js`](../server/chatbot/knowledge-base.js):
- **Service Discovery**: Matches citizen needs (e.g. *"How do I apply for an Income Certificate?"*) to cataloged services (`SRV-REV-002`) and provides direct links to start applications.
- **Document Guidance**: Details required documents (marksheet, caste proof, income slips) based on catalog specifications.
- **Turnaround Times & SLAs**: Details statutory service delivery timelines (e.g. 10–14 working days).
- **Status Meanings**: Explains portal lifecycle stages (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUIRED`, `APPROVED`, `REJECTED`, `COMPLETED`).
- **Interactive Action Links**: Attaches structured UI actions (`VIEW_SERVICE`, `START_APPLICATION`, `TRACK_APPLICATION`).

---

## 5. Provider Architecture

Located in [`server/chatbot/providers/ai-provider.js`](../server/chatbot/providers/ai-provider.js):
- `BaseAIProvider`: Abstract interface for model execution.
- `MockAIProvider`: Default provider for development and testing. Produces deterministic, grounded answers based strictly on catalog knowledge.
- `LLMProvider`: Extensible integration point for future government AI models, reading `CHATBOT_API_URL` and `LLM_API_KEY` from server-side environment variables without exposing keys to frontend code.

---

## 6. API Gateway Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/chatbot/suggestions` | All (Public) | Returns suggested starter prompts |
| `POST` | `/api/v1/chatbot/sessions` | All (Public / Authenticated) | Creates a new chat session |
| `GET` | `/api/v1/chatbot/sessions/:id` | Session Owner / Admin | Retrieves conversation history |
| `POST` | `/api/v1/chatbot/sessions/:id/messages` | Session Owner | Sends message and receives grounded AI response |
| `DELETE` | `/api/v1/chatbot/sessions/:id` | Session Owner | Clears conversation messages |

---

## 7. Audit Logging

Every interaction is logged in the immutable audit log:
- `CHATBOT_QUERY`: Logs session ID, querying user role, and event timestamp without recording sensitive PII or credentials.
