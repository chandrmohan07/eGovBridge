# Phase 9 — Data Standardization & Canonical Models

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 9  
**Specification Schema**: [`config/data-models/canonical-schemas.json`](../config/data-models/canonical-schemas.json)

---

## 1. Overview & Architectural Goal

Different government department systems represent identical citizen concepts using disparate naming conventions, structures, and legacy formats:

```text
Department A (DigiLocker):
{ "citizen_name": "...", "dob_ddmmyyyy": "15-08-1995", "phone_number": "9876543210" }

Department B (Education Board):
{ "candidate_name": "...", "birth_dt": "1995/08/15", "contact_no": "09876543210" }

Department C (Land Revenue):
{ "applicant_nm": "...", "d_o_b": "1995-08-15", "mobile": "9876543210" }
```

Rather than forcing legacy government databases to rebuild their internal schemas, Phase 9 establishes a **Canonical Data Model (CDM)** and a bidirectional normalization layer. Disparate department payloads translate into a single unified format internally (`canonicalVersion: "1.0"`), and translate back into department formats when required.

---

## 2. Architecture & Normalization Pipeline

```text
Department-Specific Payload (Legacy Structure)
                    ↓
        Department Data Mapper
        (Identity, Education, Health, Revenue, Transport, Welfare)
                    ↓
        Field & Format Normalization
        ├── Dates: DD-MM-YYYY / YYYY/MM/DD → YYYY-MM-DD (ISO 8601)
        ├── Phone: 10 digits / leading 0 / +91 → +91 XXXXX XXXXX
        ├── Pincode: Validated 6-digit Indian PIN [1-9][0-9]{5}
        ├── Gender: M/F/TG → MALE / FEMALE / TRANSGENDER / OTHER
        └── Status: APPROVED/CLEARED → COMPLETED; REJECTED → FAILED
                    ↓
        Canonical Data Model (v1.0)
                    ↓
     Validation Layer (Type, Schema, Version Enforcement)
                    ↓
     Orchestration Engine & Department Adapters
```

---

## 3. Data Dictionary: Canonical Contracts

### 3.1 `Address` Entity
| Field Name | Type | Required | Constraints / Pattern | Description |
|---|---|---|---|---|
| `addressLine` | `string` | **Yes** | Min 3, Max 200 chars | Street name, house number, or locality |
| `city` | `string` | No | Max 100 chars | City, town, village, or tehsil |
| `district` | `string` | **Yes** | Min 2, Max 100 chars | Administrative revenue district |
| `state` | `string` | **Yes** | Min 2, Max 100 chars | State or Union Territory |
| `pincode` | `string` | **Yes** | `^[1-9][0-9]{5}$` | Standard 6-digit Indian Postal PIN Code |

### 3.2 `Citizen` Entity
| Field Name | Type | Required | Constraints / Pattern | Description |
|---|---|---|---|---|
| `citizenId` | `string` | **Yes** | Min 3 chars | Internal platform / sandbox citizen identifier |
| `name` | `string` | **Yes** | Min 2, Max 120 chars | Full legal name of citizen |
| `dateOfBirth` | `string` | No | `^\d{4}-\d{2}-\d{2}$` | Normalized ISO 8601 birth date (YYYY-MM-DD) |
| `gender` | `string` | No | `MALE`, `FEMALE`, `TRANSGENDER`, `OTHER` | Normalized gender |
| `mobile` | `string` | **Yes** | `^\+91 \d{5} \d{5}$` | Canonical Indian mobile telephone number |
| `email` | `string` | No | Valid email regex | Electronic mail address |
| `address` | `Address` | **Yes** | Valid `Address` object | Canonical residential address |

### 3.3 `Application` Entity
| Field Name | Type | Required | Constraints / Pattern | Description |
|---|---|---|---|---|
| `applicationId` | `string` | **Yes** | `^APP-\d{4}-[A-Z0-9]+$` | Platform unique application reference |
| `citizenId` | `string` | **Yes** | Min 3 chars | Reference to applicant |
| `serviceId` | `string` | **Yes** | Min 3 chars | Target service catalog ID |
| `departmentCode`| `string` | **Yes** | Min 2 chars | Assigned nodal department code |
| `status` | `string` | **Yes** | `DRAFT`, `SUBMITTED`, `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `REJECTED` | Normalized lifecycle stage |
| `submittedAt` | `string` | **Yes** | ISO-8601 timestamp | Application submission timestamp |
| `documents` | `array` | No | Array of `DocumentReference` | Uploaded / verified documents |
| `canonicalVersion`| `string` | **Yes** | Defaults to `"1.0"` | Schema version tag |

### 3.4 `DocumentReference` Entity
| Field Name | Type | Required | Constraints / Pattern | Description |
|---|---|---|---|---|
| `documentId` | `string` | **Yes** | Non-empty | Unique document reference identifier |
| `documentType` | `string` | **Yes** | Non-empty | Categorical document type |
| `documentNumber`| `string` | No | String | Certificate or registration number |
| `issuedBy` | `string` | No | String | Issuing authority or department |
| `issuedDate` | `string` | No | `^\d{4}-\d{2}-\d{2}$` | Date of issuance |
| `verificationStatus` | `string` | **Yes** | `PENDING`, `UPLOADED`, `VERIFIED`, `REJECTED` | Verification state |

---

## 4. Department Mappers Reference

| Mapper | Department | Input Sample (Department Format) | Canonical Mapping Output |
|---|---|---|---|
| `Identity` | DigiLocker / UIDAI | `uid_ref`, `full_name`, `dob_ddmmyyyy`, `phone_number` | `citizenId`, `name`, `dateOfBirth`, `mobile` |
| `Education` | Higher Education Board | `student_id`, `candidate_name`, `birth_dt`, `contact_no` | `citizenId`, `name`, `dateOfBirth`, `mobile`, `academicDetails` |
| `Health` | PM-JAY / NHA | `beneficiary_id`, `beneficiary_name`, `dob`, `mobile_num` | `citizenId`, `name`, `dateOfBirth`, `mobile`, `healthQuota` |
| `Revenue` | Land Records / Bhulekh | `applicant_nm`, `d_o_b`, `mobile`, `khasra_no` | `name`, `dateOfBirth`, `mobile`, `revenueDetails` |
| `Transport` | Sarathi / Parivahan | `dl_applicant_name`, `date_of_birth`, `cell_number` | `name`, `dateOfBirth`, `mobile`, `transportDetails` |
| `Welfare` | PFMS / Social Welfare | `beneficiary_name`, `dob`, `contact_mobile`, `account_no` | `name`, `dateOfBirth`, `mobile`, `financialDetails` |

---

## 5. API Gateway Endpoints for Standardization

The API Gateway exposes validation and translation routes under `/api/v1/standardization/*`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/standardization/schemas` | Returns canonical schema definitions and version (`1.0`) |
| `POST` | `/api/v1/standardization/validate` | Validates a Citizen, Address, or Application object against canonical schema |
| `POST` | `/api/v1/standardization/normalize` | Converts department-specific data to canonical format |
| `POST` | `/api/v1/standardization/transform` | Converts canonical data to target department format |

---

## 6. Privacy & Security Principles
- **Data Minimization**: Only collects and maps fields strictly required for service evaluation.
- **Masking Sensitive Data**: Financial accounts are mapped to masked tokens (e.g. `XXXX-1234`).
- **Input Sanitization**: Invalid or malicious phone/pincode injections are rejected during normalization.
