# Development Rules & Protocol Reference

This document encapsulates the mandatory development principles established in [`PLAN.md`](../PLAN.md) for the SIH Government Service Integration Platform.

---

## 1. Non-Negotiable Phase Gate Rule

1. **Strict Stop Condition**:
   - Work is confined strictly to the currently assigned phase.
   - Upon completing the phase implementation, running all verification tests, and delivering the Phase Completion Report, **execution MUST stop immediately**.
   - The assistant will NEVER begin the next phase automatically or interpret generic encouraging remarks as authorization to proceed.
   - Progression to the next phase requires explicit user instruction.

2. **Mandatory Final Line**:
   - Every phase completion response must conclude with the exact line:  
     `PHASE [X] COMPLETE. WAITING FOR USER PROMPT.`

---

## 2. Credit-Efficiency & No Wasted Work

1. **Inspect Before Edit**:
   - Always inspect repository contents before writing new code.
   - Reuse existing utilities, layout, styles, and data models.
2. **Minimal Safe Change**:
   - Avoid creating duplicate files, deleting working modules, or reinstalling packages unnecessarily.
   - Implement only the code required to satisfy the active phase deliverables.
3. **Targeted Testing**:
   - Test current phase additions thoroughly rather than endlessly re-executing end-to-end builds for small edits.

---

## 3. Centralized External Configuration (Rule 3)

1. **Dedicated Configuration Area**:
   - `config/external-apis.json` for all external services, adapters, and endpoints.
   - `config/external-urls.json` for public portal URLs and source links.
   - `config/README.md` for human-readable registry and audit table.
2. **Zero In-Code Secrets**:
   - Never embed secret keys, API tokens, or passwords in frontend code, git commits, or mock data.
   - Base URLs and keys are injected exclusively via environment variables (`.env`).
   - `.env.example` provides non-secret placeholders and documentation.

---

## 4. Outside Work & External Setup Protocol (Rule 4)

1. **Explicit Identification**:
   - At the conclusion of every phase, the assistant reports whether any action outside the codebase is required (developer portals, accounts, API keys, credentials, approvals).
2. **Mock / Sandbox Default**:
   - If an official government API is not publicly accessible or requires government departmental clearance, the platform builds a clean, realistic Mock Adapter conforming to canonical schemas.
   - Never invent unauthorized endpoints or claim mock data is live government data.
3. **Confidentiality**:
   - The user is never requested to share sensitive passwords, OTPs, or private keys in the AI chat. Credentials are kept locally in `.env`.
