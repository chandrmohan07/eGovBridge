# Phase 13 — Digital Document Vault

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 13  
**Storage Abstraction**: [`server/vault/storage.js`](../server/vault/storage.js)  
**Vault Service Module**: [`server/vault/vault-service.js`](../server/vault/vault-service.js)  
**Category Configuration**: [`config/document-types.json`](../config/document-types.json)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**Frontend UI Component**: [`public/js/components/DocumentVault.js`](../public/js/components/DocumentVault.js)

---

## 1. Overview & Objective

Phase 13 establishes the **Digital Document Vault**, providing citizens with a secure, centralized repository to store, organize, and reuse verified government documents, certificates, and identity credentials across multiple unified service workflows without redundant uploads.

```text
Citizen Document Upload
          ↓
Security Checks: MIME Validation, Extension Whitelist, 5 MB Limit, Filename Sanitization
          ↓
Encrypted Vault Storage Abstraction (Zero Public Exposure)
          ↓
Digital Document Vault Repository
  ├── Stored Document Metadata (Title, Category, Expiry, Authority)
  ├── Version & Integrity Tracking
  ├── Application Association (Phase 5 Workflow Integration)
  ├── Department Officer Scoped Access (Minimum Disclosure Principle)
  └── Immutable Vault Audit Trail (Upload, View, Download, Associate, Delete)
```

---

## 2. Document Categories & Configuration

Configurable government document categories are centralized in [`config/document-types.json`](../config/document-types.json):

| Document Code | Category Label | Supported MIME Types | Max Size |
|---|---|---|---|
| `IDENTITY_PROOF` | Identity Proof (Aadhaar / Passport / Voter ID) | PDF, JPEG, PNG | 5 MB |
| `ADDRESS_PROOF` | Address Proof (Utility Bill / Ration Card) | PDF, JPEG, PNG | 5 MB |
| `INCOME_CERTIFICATE` | Income Certificate / Salary Slip | PDF, JPEG, PNG | 5 MB |
| `CASTE_CERTIFICATE` | Caste / Community Certificate | PDF, JPEG, PNG | 5 MB |
| `EDUCATION_CERTIFICATE` | Education Marksheet / Degree | PDF, JPEG, PNG | 5 MB |
| `LAND_RECORD` | Land Record / RoR / Khasra | PDF, JPEG, PNG | 5 MB |
| `EMPLOYMENT_DOCUMENT` | Employment Proof / Experience Letter | PDF, JPEG, PNG | 5 MB |
| `SCHOLARSHIP_DOCUMENT` | Scholarship Sanction / Bonafide | PDF, JPEG, PNG | 5 MB |
| `OTHER` | Other Government Proof / Affidavit | PDF, JPEG, PNG | 5 MB |

---

## 3. Storage Abstraction & Security Architecture

1. **Storage Isolation**:
   - Files are managed via `vaultStorage` abstraction (`server/vault/storage.js`).
   - Private storage keys (`vault/${citizenId}/${token}_${safeName}`) are never exposed to clients.
   - Files are stored completely outside public web root (`public/`), preventing unauthenticated URL scraping.
2. **Path Traversal Protection**:
   - Filenames are sanitized via `sanitizeFileName` (strips `..`, `/`, `\`, null bytes, control characters).
   - Any access attempt containing relative path markers immediately raises HTTP 400 `SECURITY_VIOLATION`.
3. **Execution Guard**:
   - Strictly forbids executable and script extensions (`.exe`, `.bat`, `.sh`, `.cmd`, `.msi`, `.js`, `.py`, `.php`).
   - Rejects empty (0-byte) payloads and files exceeding 5 MB limit.

---

## 4. Application Integration & Reuse

- When a citizen initiates an application in Phase 5, they can select an existing vault document reference (`vaultDocumentId`).
- The application stores a verified document reference (`{ name, fileName, fileSize, status: 'Verified (From Vault)', vaultDocumentId }`).
- The vault document updates its `applications` array (`['APP-2026-EDU-8812']`).
- **Integrity Guard**: A citizen cannot delete a vault document if it is actively linked to an in-progress application in `SUBMITTED`, `UNDER_REVIEW`, or `CLARIFICATION_REQUIRED` state (returns HTTP 400 `DOCUMENT_IN_USE`).

---

## 5. Role-Based Access Control (RBAC) & Officer Scoping

- **Citizen Isolation**: Citizens can only view, download, or delete their own documents (`doc.citizenId === user.id`). Cross-citizen attempts return HTTP 403 Forbidden.
- **Department Officer Scoping (Principle of Minimum Disclosure)**:
  - Officers do NOT have unrestricted access to a citizen's entire document vault.
  - An officer can ONLY access a document if that document is linked to an application in the officer's assigned department (`app.departmentCode === officer.departmentCode`).
  - Cross-department access attempts return HTTP 403 Forbidden.
- **Admin Access**: Administrators can monitor audit logs and aggregate system metrics.

---

## 6. Endpoints Exposed via API Gateway

All endpoints enforce Bearer token authentication:

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/vault/types` | Public / All | Returns list of configured government document categories |
| `POST` | `/api/v1/vault/documents` | `CITIZEN` | Securely uploads and registers a document into vault |
| `GET` | `/api/v1/vault/documents` | `CITIZEN` | Lists citizen's documents with `type`, `status`, and `search` filters |
| `GET` | `/api/v1/vault/documents/:id` | `CITIZEN`, Authorized `OFFICER`, `ADMIN` | Retrieves sanitized document metadata |
| `GET` | `/api/v1/vault/documents/:id/download` | `CITIZEN`, Authorized `OFFICER` | Secure binary stream or Base64 download |
| `DELETE` | `/api/v1/vault/documents/:id` | `CITIZEN` (Owner) | Deletes an unattached document |
| `POST` | `/api/v1/vault/documents/:id/associate` | `CITIZEN` | Links vault document with an existing service application |
| `GET` | `/api/v1/vault/audit` | `CITIZEN`, `ADMIN` | Retrieves immutable audit trail of document actions |

---

## 7. Audit Logging

Every document operation records an immutable entry in `vaultAuditLogs`:
- `DOCUMENT_UPLOADED`: Records document ID, owner, filename, and byte size.
- `DOCUMENT_LISTED`: Records citizen listing query.
- `DOCUMENT_METADATA_ACCESSED`: Records accessor ID and role.
- `DOCUMENT_DOWNLOADED`: Records download timestamp and accessor.
- `DOCUMENT_ASSOCIATED_WITH_APPLICATION`: Records application link.
- `DOCUMENT_DELETED`: Records deletion event.
