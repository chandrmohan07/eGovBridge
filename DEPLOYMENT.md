# SIH Government Service Integration Platform — Deployment & Production Setup Guide

This document outlines the deployment architecture, configuration parameters, containerization, cloud hosting steps, verification smoke tests, and rollback procedures for the unified platform.

---

## 1. System Architecture

The platform uses a unified, self-contained architecture with **zero external npm runtime dependencies**, running entirely on Node.js standard libraries:

```text
                                  Internet
                                     │
                             (HTTPS / Port 443)
                                     ▼
                           [ Reverse Proxy / PaaS ]
                          (Render / Railway / Nginx)
                                     │
                             (HTTP / Port 3000)
                                     ▼
                      ┌──────────────────────────────┐
                      │    Node.js Unified Server    │
                      │   (scripts/dev-server.js)    │
                      ├──────────────┬───────────────┤
                      │  API Gateway │ Static Server │
                      │  (/api/v1/*) │  (/public/*)  │
                      └──────┬───────┴───────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        [ Auth & RBAC ] [ Orchestrator ] [ Document Vault ]
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                  [ In-Memory Datastore ]
                (Stateful Services & Cache)
```

---

## 2. Prerequisites

- **Node.js**: Version 20.0.0 LTS or higher
- **npm**: Version 10.0.0 or higher
- **(Optional) Docker**: Version 24+ and Docker Compose v2+

---

## 3. Environment Variables Reference

All runtime parameters are configurable via environment variables. Refer to [`.env.example`](./.env.example) for a pre-formatted template.

| Variable Name | Default Value | Purpose / Description | Security Classification |
|---|---|---|---|
| `PORT` | `3000` | HTTP port on which the web server listens | Non-Sensitive |
| `HOST` | `0.0.0.0` | Network interface binding (`0.0.0.0` for containers/cloud) | Non-Sensitive |
| `NODE_ENV` | `production` | Runtime mode (`development` or `production`) | Non-Sensitive |
| `GATEWAY_RATE_LIMIT_MAX` | `120` | Max requests permitted per IP per sliding window | Non-Sensitive |
| `GATEWAY_RATE_LIMIT_WINDOW_MS` | `60000` | Rate limiting sliding window duration (milliseconds) | Non-Sensitive |
| `GATEWAY_TIMEOUT_MS` | `10000` | Downstream handler timeout threshold (milliseconds) | Non-Sensitive |
| `CORS_ALLOWED_ORIGIN` | `http://localhost:3000` | Allowed frontend origin for CORS policies | Non-Sensitive |
| `DATA_EXCHANGE_TIMEOUT_SECONDS` | `60` | Inter-department data exchange request expiry | Non-Sensitive |
| `EDUCATION_API_URL` | `https://api.education.gov.mock` | Mock Higher Education Adapter URL | Non-Sensitive |
| `EDUCATION_API_KEY` | *(Placeholder)* | Bearer/API token for Education integration | **Sensitive** (Backend Only) |
| `INCOME_API_URL` | `https://api.revenue.gov.mock` | Mock Revenue & Income Adapter URL | Non-Sensitive |
| `INCOME_API_KEY` | *(Placeholder)* | Bearer/API token for Revenue integration | **Sensitive** (Backend Only) |
| `HEALTH_API_URL` | `https://api.health.gov.mock` | Mock Health Records & Ayushman Adapter URL | Non-Sensitive |
| `HEALTH_API_KEY` | *(Placeholder)* | Bearer/API token for Health integration | **Sensitive** (Backend Only) |
| `LAND_API_URL` | `https://api.landrecords.gov.mock`| Mock Land Records (Bhulekh) Adapter URL | Non-Sensitive |
| `LAND_API_KEY` | *(Placeholder)* | Bearer/API token for Land Records | **Sensitive** (Backend Only) |
| `TRANSPORT_API_URL` | `https://api.transport.gov.mock`| Mock Parivahan/Sarathi Adapter URL | Non-Sensitive |
| `TRANSPORT_API_KEY` | *(Placeholder)* | Bearer/API token for Transport integration | **Sensitive** (Backend Only) |
| `SCHOLARSHIP_API_URL` | `https://api.scholarships.gov.mock`| Mock National Scholarship Portal URL | Non-Sensitive |
| `SCHOLARSHIP_API_KEY` | *(Placeholder)* | Bearer/API token for Scholarship integration | **Sensitive** (Backend Only) |
| `CHATBOT_API_URL` | `https://api.ai-gateway.gov.mock` | External LLM Gateway URL (if configured) | Non-Sensitive |
| `LLM_API_KEY` | *(Placeholder)* | External LLM API Key (if configured) | **Sensitive** (Backend Only) |

> [!IMPORTANT]
> Never commit `.env` or paste actual API keys/tokens into version control. Supply sensitive values exclusively through your cloud hosting provider's Secret / Environment Variable dashboard.

---

## 4. Deployment Methods

### Method A: Docker Container (Recommended)

1. **Build Container Image**:
   ```bash
   docker build -t sih-government-platform:latest .
   ```
2. **Run Container**:
   ```bash
   docker run -d \
     --name sih-platform \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e PORT=3000 \
     sih-government-platform:latest
   ```
3. **Verify Container Health**:
   ```bash
   docker ps
   # Should report (healthy) status
   ```

### Method B: Docker Compose (Multi-Service / Staging)

```bash
docker compose up -d
```

### Method C: PaaS Cloud Hosting (Render / Railway / Fly.io)

1. **Push Code to GitHub**:
   Ensure master branch is clean and all tests pass (`npm test`).
2. **Create New Web Service**:
   - Environment: `Node`
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/v1/health`
3. **Configure Environment Variables**:
   In the hosting provider dashboard, add all non-default values from `.env.example`.
4. **Deploy**:
   The PaaS will build and deploy the container, providing automatic HTTPS certificates.

---

## 5. Production HTTPS & Domain Setup

1. **Automatic PaaS TLS**: Providers like Render, Railway, Vercel, and Cloudflare Pages automatically provision and renew Let's Encrypt SSL/TLS certificates for custom domains.
2. **DNS Configuration for Custom Domain**:
   - `CNAME` record: `www` pointing to your PaaS hostname (e.g. `sih-platform.onrender.com`).
   - `A` / `ALIAS` record for root apex domain.
3. **Update CORS Configuration**:
   Update `CORS_ALLOWED_ORIGIN` in environment variables to match your custom production domain (e.g. `https://sih.gov.example`).

---

## 6. Post-Deployment Smoke Test Sequence

Run this quick verification flow immediately after deploying to a new environment:

### Step 1: Health & Readiness Check
```bash
curl -i https://<your-domain>/api/v1/health
# Expected: HTTP 200 OK with {"status":"HEALTHY",...}
```

### Step 2: Citizen Flow
1. Open `https://<your-domain>/` in browser.
2. Register a new citizen account or login.
3. Browse the Service Catalog (`GET /api/v1/services`).
4. Save an application draft and upload a document to Document Vault.
5. Submit the application and confirm the tracking stepper reflects `SUBMITTED`.

### Step 3: Officer Flow
1. Login with demo credentials: `officer.edu@gov.in` / `Officer@123`.
2. Inspect Department Application Queue.
3. Claim the submitted application and verify status updates to `UNDER_REVIEW`.
4. Approve the application and verify certificate issuance.

### Step 4: Administrator Flow
1. Login with demo credentials: `admin@gov.in` / `Admin@123`.
2. Inspect Executive Analytics Dashboard and Platform Health.
3. Query Centralized Audit Logs (`GET /api/v1/admin/audit-logs`).
4. Check Cache Performance Statistics (`GET /api/v1/admin/cache-stats`).

---

## 7. Rollback & Disaster Recovery Procedures

If a deployment failure or regression is detected in production:

```text
Incident Detected (Alert / Smoke Test Failure)
         │
         ▼
1. Isolate Problematic Deployment
         │
         ▼
2. Rollback to Previous Release Tag
   (e.g., git checkout <previous-commit-hash> or PaaS "Rollback" button)
         │
         ▼
3. Re-run Build Verification (node scripts/build.js)
         │
         ▼
4. Redeploy Previous Artifact
         │
         ▼
5. Execute Smoke Test Sequence
```

---

## 8. Security & Privacy Audit Verification

- [x] Zero external runtime npm packages (zero CVE supply-chain attack surface).
- [x] Passwords salted and hashed with SHA-256 HMAC; never returned in API responses.
- [x] `.env` excluded from version control via `.gitignore`.
- [x] `.env.example` contains zero real secrets or credentials.
- [x] HTTP security headers active (`X-Frame-Options`, `nosniff`, `CSP`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`).
- [x] File uploads validated for extension, MIME type, size limit (5 MB), and path traversal.
- [x] Citizen IDOR protection and officer department boundary isolation enforced.
