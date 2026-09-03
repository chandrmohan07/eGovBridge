# Phase 14 — Notification System

**Status**: Completed  
**Reference Document**: [`PLAN.md`](../PLAN.md) — Phase 14  
**Notification Types & Templates**: [`config/notification-types.json`](../config/notification-types.json) & [`server/notifications/templates.js`](../server/notifications/templates.js)  
**Provider Abstraction**: [`server/notifications/providers/provider-interface.js`](../server/notifications/providers/provider-interface.js)  
**Notification Service**: [`server/notifications/notification-service.js`](../server/notifications/notification-service.js)  
**API Router Integration**: [`server/api-router.js`](../server/api-router.js)  
**Frontend UI Component**: [`public/js/components/Notifications.js`](../public/js/components/Notifications.js)

---

## 1. Overview & Objective

Phase 14 delivers the centralized **Notification System**, providing citizens, authorized departmental officers, and administrators with real-time updates regarding application progress, verification milestones, clarification requests, statutory approvals, and system-level alerts.

```text
Workflow Event Occurs
  (Submission / Claim / Clarification / Approval / Rejection / Completion)
          ↓
Resilient Event Trigger Helper (Safe Failure Handling)
          ↓
Centralized Template Engine (Variable Interpolation)
          ↓
Notification Dispatcher
  ├── Primary: In-App Provider (Persisted in DB)
  ├── Mock/Extensible: Email Provider (Ready for Gov Email Gateway)
  └── Mock/Extensible: SMS Provider (Ready for NIC SMS Gateway)
          ↓
Citizen & Officer In-Portal Activity Feed
  ├── Real-time Badge & Unread Counters
  ├── Priority Tags (Normal, High, Urgent)
  ├── Action Center (Mark as Read, Mark All as Read, Archive)
  └── Direct Deep Link to Application Tracking (APP-2026-...)
```

---

## 2. Notification Data Model

Each notification record conforms to:
- `id`: Unique identifier (e.g. `NOTIF-2026-XXXX`).
- `recipientUserId`: Target user identifier (`USR-CIT-...`, `USR-OFF-...`, `USR-ADM-...`).
- `recipientRole`: Recipient role (`CITIZEN`, `OFFICER`, `ADMIN`).
- `applicationId`: Associated application reference (e.g. `APP-2026-EDU-8812`).
- `type`: Standardized event type code.
- `title`: Short descriptive title with interpolated variables.
- `message`: Citizen-safe or officer-relevant guidance message.
- `status`: `UNREAD`, `READ`, or `ARCHIVED`.
- `priority`: `LOW`, `NORMAL`, `HIGH`, or `URGENT`.
- `category`: `Application`, `Verification`, `Action Required`, `Approval`, `Rejection`, `Delivery`, `Officer`, `System`.
- `metadata`: Contextual key-value payload (e.g. `departmentCode`, `serviceName`, `reason`, `remarks`).
- `createdAt`: ISO 8601 timestamp.
- `readAt`: ISO 8601 timestamp or `null`.

---

## 3. Centralized Notification Types & Templates

Notification definitions are centrally managed in [`config/notification-types.json`](../config/notification-types.json):

| Notification Type | Category | Default Priority | Triggering Event |
|---|---|---|---|
| `APPLICATION_SUBMITTED` | Application | `NORMAL` | Citizen submits new application or completes draft |
| `APPLICATION_RECEIVED` | Application | `NORMAL` | Application enters nodal department queue |
| `APPLICATION_ASSIGNED` | Application | `NORMAL` | Authorized officer claims application |
| `APPLICATION_UNDER_REVIEW` | Application | `NORMAL` | Department scrutiny commences |
| `VERIFICATION_REQUIRED` | Verification | `HIGH` | Inter-department cross-check pending |
| `CLARIFICATION_REQUIRED` | Action Required | `URGENT` | Officer requests additional documentation or proofs |
| `CLARIFICATION_SUBMITTED` | Application | `NORMAL` | Citizen submits clarification response |
| `DOCUMENT_REQUIRED` | Action Required | `HIGH` | Missing mandatory vault certificate |
| `APPLICATION_APPROVED` | Approval | `HIGH` | Officer issues statutory approval |
| `APPLICATION_REJECTED` | Rejection | `HIGH` | Officer documents statutory rejection ground |
| `APPLICATION_COMPLETED` | Delivery | `HIGH` | Service delivered & digital certificate generated |
| `OFFICER_TASK_ASSIGNED` | Officer | `HIGH` | New application enters officer's department queue |
| `OFFICER_TASK_UPDATED` | Officer | `NORMAL` | Application status or documentation updated |
| `SYSTEM_ALERT` | System | `URGENT` | Platform or integration alert for administrators |

---

## 4. Provider Architecture & Multi-Channel Abstraction

Created [`server/notifications/providers/provider-interface.js`](../server/notifications/providers/provider-interface.js):
- `InAppNotificationProvider`: Default provider storing notifications in the primary transactional database.
- `EmailNotificationProvider` (Mock/Abstraction): Dispatches mock emails, logs dispatches safely without external SMTP dependencies.
- `SmsNotificationProvider` (Mock/Abstraction): Dispatches mock SMS alerts, logs dispatches safely without external gateway credentials.
- `NotificationDispatcher`: Checks user channel preferences (`inAppEnabled`, `emailEnabled`, `smsEnabled`) and fans out delivery.

---

## 5. Resilient Event Triggers

All notification trigger helpers in [`server/notifications/notification-service.js`](../server/notifications/notification-service.js) are designed with **safe failure handling**:
- `safeNotifyApplicationSubmitted`
- `safeNotifyOfficerClaim`
- `safeNotifyClarificationRequested`
- `safeNotifyClarificationSubmitted`
- `safeNotifyApplicationApproved`
- `safeNotifyApplicationRejected`
- `safeNotifyApplicationCompleted`

**Crucial Resiliency Rule**: If a notification dispatch or database persistence fails, it is caught and logged separately. The primary business action (e.g. citizen application submission, officer claim, or approval) always succeeds uninterrupted.

---

## 6. API Gateway Endpoints

All endpoints require Bearer token authentication:

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications/types` | All | Returns configured notification types and templates |
| `GET` | `/api/v1/notifications/unread-count` | `CITIZEN`, `OFFICER`, `ADMIN` | Returns unread notification count for current user |
| `GET` | `/api/v1/notifications` | `CITIZEN`, `OFFICER`, `ADMIN` | Lists notifications with `status`, `type`, `limit`, and `offset` filters |
| `POST` | `/api/v1/notifications/:id/read` | Recipient / Authorized Officer | Marks a single notification as read |
| `POST` | `/api/v1/notifications/mark-all-read` | Recipient | Marks all unread notifications for current user as read |
| `DELETE` | `/api/v1/notifications/:id` | Recipient | Archives a notification from active view |
| `GET` | `/api/v1/notifications/preferences` | Recipient | Retrieves channel preferences (in-app, email, SMS) |
| `PUT` | `/api/v1/notifications/preferences` | Recipient | Updates channel preferences |
| `POST` | `/api/v1/notifications` | `OFFICER`, `ADMIN` | Dispatches custom or system alert notification |

---

## 7. Security & Department Scoping

1. **User Isolation**:
   - Citizens can only view, read, and archive notifications where `recipientUserId === user.id`. Cross-user modifications return HTTP 403 Forbidden.
2. **Department Scoping**:
   - Department officers only receive task notifications for applications submitted to their assigned ministry (`metadata.departmentCode === officer.departmentCode`).
3. **Data Protection**:
   - Sensitive credentials, secret tokens, private officer notes, and raw orchestration payloads are strictly excluded from notification titles and messages.
