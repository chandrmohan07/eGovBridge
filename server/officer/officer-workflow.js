/**
 * SIH Government Service Integration Platform — Department Officer Workflow
 * Secure application review, claim/assignment, clarification requests, approvals, rejections,
 * internal notes, timeline auditing, and orchestration synchronization.
 */

import crypto from 'node:crypto';
import { db } from '../db.js';
import { TASK_STATUS, ORCHESTRATION_STATUS, updateTaskDependencies, computeOrchestrationStatus } from '../orchestrator.js';

export class OfficerWorkflowError extends Error {
  constructor(message, statusCode = 400, code = 'WORKFLOW_ERROR') {
    super(message);
    this.name = 'OfficerWorkflowError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Ensures an application has default Phase 11 workflow properties initialized
 */
export function ensureWorkflowFields(app) {
  if (!app) return app;
  if (!app.timeline) {
    app.timeline = [
      {
        id: `TL-${crypto.randomBytes(3).toString('hex')}`,
        event: 'SUBMITTED',
        actor: app.applicantName || 'Citizen',
        role: 'CITIZEN',
        timestamp: app.submittedAt || app.createdAt || new Date().toISOString(),
        description: 'Application successfully submitted and entered departmental queue.'
      }
    ];
  }
  if (!app.clarifications) app.clarifications = [];
  if (!app.internalNotes) app.internalNotes = [];
  if (app.version === undefined) app.version = 1;
  if (app.assignedOfficerId === undefined) app.assignedOfficerId = null;
  if (app.assignedOfficerName === undefined) app.assignedOfficerName = null;
  return app;
}

/**
 * Lists applications in the officer's authorized departmental queue
 */
export function getOfficerQueue(officer, filters = {}) {
  if (!officer || officer.role !== 'OFFICER' || !officer.departmentCode) {
    throw new OfficerWorkflowError('Access Denied: Valid officer session required.', 403, 'UNAUTHORIZED_ROLE');
  }

  // Strictly enforce department boundary
  const apps = db.getDepartmentalApplications(officer.departmentCode);

  let filtered = apps.map(ensureWorkflowFields);

  // Filter by status
  if (filters.status && filters.status !== 'ALL') {
    const statusQuery = filters.status.toUpperCase();
    filtered = filtered.filter(a => a.status === statusQuery);
  }

  // Filter by assignment
  if (filters.assignedToMe === 'true' || filters.assignedToMe === true) {
    filtered = filtered.filter(a => a.assignedOfficerId === officer.id);
  } else if (filters.unassigned === 'true' || filters.unassigned === true) {
    filtered = filtered.filter(a => !a.assignedOfficerId);
  }

  // Search filter
  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    filtered = filtered.filter(a => 
      (a.id && a.id.toLowerCase().includes(q)) ||
      (a.serviceName && a.serviceName.toLowerCase().includes(q)) ||
      (a.applicantName && a.applicantName.toLowerCase().includes(q))
    );
  }

  // Return queue summary view (without exposing internal notes or full formData)
  return filtered.map(a => ({
    id: a.id,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    applicantId: a.applicantId,
    applicantName: a.applicantName,
    departmentCode: a.departmentCode,
    status: a.status,
    currentStage: a.currentStage,
    submittedDate: a.submittedDate,
    assignedOfficerId: a.assignedOfficerId,
    assignedOfficerName: a.assignedOfficerName,
    version: a.version,
    clarificationCount: a.clarifications.filter(c => c.status === 'PENDING').length,
    updatedAt: a.updatedAt || a.submittedDate
  }));
}

/**
 * Retrieves the raw database application record for mutation, verifying officer role & department
 */
export function getRawApplication(officer, applicationId) {
  if (!officer || officer.role !== 'OFFICER' || !officer.departmentCode) {
    throw new OfficerWorkflowError('Access Denied: Valid officer session required.', 403, 'UNAUTHORIZED_ROLE');
  }

  const app = db.getApplicationById(applicationId);
  if (!app) {
    throw new OfficerWorkflowError(`Application not found: ${applicationId}`, 404, 'NOT_FOUND');
  }

  // Enforce department boundary
  if (app.departmentCode !== officer.departmentCode) {
    throw new OfficerWorkflowError(
      `Access Denied: Officer of ${officer.departmentCode} cannot view applications belonging to ${app.departmentCode}`,
      403,
      'CROSS_DEPARTMENT_FORBIDDEN'
    );
  }

  return ensureWorkflowFields(app);
}

/**
 * Retrieves full application details for an authorized officer
 */
export function getOfficerApplicationDetail(officer, applicationId) {
  const app = getRawApplication(officer, applicationId);

  // Attach linked orchestration status if present
  let orchestrationSummary = null;
  if (app.orchestrationId) {
    const orch = db.getOrchestrationById(app.orchestrationId);
    if (orch) {
      orchestrationSummary = {
        id: orch.id,
        status: orch.status,
        tasks: orch.tasks.map(t => ({
          code: t.code,
          title: t.title,
          department: t.department,
          status: t.status,
          output: t.output
        }))
      };
    }
  }

  return {
    ...app,
    orchestration: orchestrationSummary
  };
}

/**
 * Claims an application for review by the logged-in officer
 */
export function claimApplication(officer, applicationId, expectedVersion = null) {
  const app = getRawApplication(officer, applicationId);

  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(app.status)) {
    throw new OfficerWorkflowError(`Cannot claim application in terminal status: ${app.status}`, 400, 'INVALID_STATUS');
  }

  // Optimistic concurrency check
  if (expectedVersion !== null && app.version !== expectedVersion) {
    throw new OfficerWorkflowError('Application was modified by another officer. Please reload and try again.', 409, 'CONCURRENCY_CONFLICT');
  }

  // Check if claimed by another officer
  if (app.assignedOfficerId && app.assignedOfficerId !== officer.id) {
    throw new OfficerWorkflowError(`Application is already claimed by officer: ${app.assignedOfficerName}`, 409, 'ALREADY_CLAIMED');
  }

  const now = new Date().toISOString();
  app.assignedOfficerId = officer.id;
  app.assignedOfficerName = officer.name;
  app.claimedAt = now;
  app.status = 'UNDER_REVIEW';
  app.currentStage = 'Officer Document Review & Verification';
  app.version = (app.version || 1) + 1;
  app.updatedAt = now;

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'CLAIMED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Application claimed for review by ${officer.name} (${officer.departmentCode}).`
  });

  return app;
}

/**
 * Starts review on an assigned application
 */
export function startReview(officer, applicationId) {
  const app = getRawApplication(officer, applicationId);

  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(app.status)) {
    throw new OfficerWorkflowError(`Cannot start review on application in status: ${app.status}`, 400, 'INVALID_STATUS');
  }

  const now = new Date().toISOString();
  app.status = 'UNDER_REVIEW';
  app.reviewStartedAt = now;
  app.currentStage = 'Active Scrutiny by Department Officer';
  app.version = (app.version || 1) + 1;
  app.updatedAt = now;

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'REVIEW_STARTED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Formal departmental review and scrutiny commenced by ${officer.name}.`
  });

  return app;
}

/**
 * Officer requests clarification / additional documentation from citizen
 */
export function requestClarification(officer, applicationId, { requestedInfo, reason }) {
  if (!requestedInfo || String(requestedInfo).trim().length < 5) {
    throw new OfficerWorkflowError('Detailed requested information is required (min 5 characters).', 400, 'INVALID_REQUESTED_INFO');
  }
  if (!reason || String(reason).trim().length < 5) {
    throw new OfficerWorkflowError('Reason for clarification is required (min 5 characters).', 400, 'INVALID_REASON');
  }

  const app = getRawApplication(officer, applicationId);

  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(app.status)) {
    throw new OfficerWorkflowError(`Cannot request clarification for application in status: ${app.status}`, 400, 'INVALID_STATUS');
  }

  const now = new Date().toISOString();
  const clarificationId = `CLR-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const clarification = {
    clarificationId,
    officerId: officer.id,
    officerName: officer.name,
    departmentCode: officer.departmentCode,
    requestedInfo: requestedInfo.trim(),
    reason: reason.trim(),
    status: 'PENDING',
    createdAt: now,
    resolvedAt: null,
    citizenResponse: null
  };

  app.clarifications.unshift(clarification);
  app.status = 'CLARIFICATION_REQUIRED';
  app.currentStage = 'Awaiting Citizen Clarification / Resubmission';
  app.version = (app.version || 1) + 1;
  app.updatedAt = now;

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'CLARIFICATION_REQUESTED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Officer requested clarification: ${reason.trim()}`
  });

  return { app, clarification };
}

/**
 * Adds an internal officer note (protected from citizen visibility)
 */
export function addOfficerNote(officer, applicationId, { note }) {
  if (!note || String(note).trim().length < 3) {
    throw new OfficerWorkflowError('Note content must be at least 3 characters.', 400, 'INVALID_NOTE');
  }

  const app = getRawApplication(officer, applicationId);

  const now = new Date().toISOString();
  const noteEntry = {
    noteId: `NOTE-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    officerId: officer.id,
    officerName: officer.name,
    departmentCode: officer.departmentCode,
    note: note.trim(),
    createdAt: now
  };

  app.internalNotes.unshift(noteEntry);
  app.updatedAt = now;

  return noteEntry;
}

/**
 * Approves an application and synchronizes linked orchestration tasks
 */
export function approveApplication(officer, applicationId, { remarks = '' } = {}) {
  const app = getRawApplication(officer, applicationId);

  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(app.status)) {
    throw new OfficerWorkflowError(`Application has already been decided with status: ${app.status}`, 400, 'ALREADY_DECIDED');
  }

  const now = new Date().toISOString();
  app.status = 'APPROVED';
  app.currentStage = 'Approved by Department Officer — Scheduled for Issuance';
  app.version = (app.version || 1) + 1;
  app.updatedAt = now;

  app.decision = {
    verdict: 'APPROVED',
    officerId: officer.id,
    officerName: officer.name,
    departmentCode: officer.departmentCode,
    remarks: remarks.trim() || 'All departmental verification criteria satisfied.',
    decidedAt: now
  };

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'APPROVED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Application approved by ${officer.name}. ${app.decision.remarks}`
  });

  // Synchronize linked Phase 6 Orchestration
  if (app.orchestrationId) {
    const orch = db.getOrchestrationById(app.orchestrationId);
    if (orch) {
      // Find task matching officer's department and mark COMPLETED
      const deptTask = orch.tasks.find(t => 
        (t.departmentCode === officer.departmentCode || t.department === officer.departmentCode) &&
        t.status !== TASK_STATUS.COMPLETED
      );
      if (deptTask) {
        deptTask.status = TASK_STATUS.COMPLETED;
        deptTask.completedAt = now;
        deptTask.output = {
          verdict: 'APPROVED',
          officerId: officer.id,
          officerName: officer.name,
          timestamp: now
        };
        updateTaskDependencies(orch.tasks);
        orch.status = computeOrchestrationStatus(orch.tasks);
        orch.updatedAt = now;
      }
    }
  }

  return app;
}

/**
 * Rejects an application with mandatory documented reason
 */
export function rejectApplication(officer, applicationId, { reason, remarks = '' }) {
  if (!reason || String(reason).trim().length < 5) {
    throw new OfficerWorkflowError('Mandatory rejection reason is required (minimum 5 characters).', 400, 'MISSING_REJECTION_REASON');
  }

  const app = getRawApplication(officer, applicationId);

  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(app.status)) {
    throw new OfficerWorkflowError(`Application has already been decided with status: ${app.status}`, 400, 'ALREADY_DECIDED');
  }

  const now = new Date().toISOString();
  app.status = 'REJECTED';
  app.currentStage = `Application Rejected: ${reason.trim()}`;
  app.version = (app.version || 1) + 1;
  app.updatedAt = now;

  app.decision = {
    verdict: 'REJECTED',
    officerId: officer.id,
    officerName: officer.name,
    departmentCode: officer.departmentCode,
    reason: reason.trim(),
    remarks: remarks.trim(),
    decidedAt: now
  };

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'REJECTED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Application rejected by ${officer.name}. Reason: ${reason.trim()}`
  });

  // Synchronize linked Phase 6 Orchestration
  if (app.orchestrationId) {
    const orch = db.getOrchestrationById(app.orchestrationId);
    if (orch) {
      const deptTask = orch.tasks.find(t => 
        (t.departmentCode === officer.departmentCode || t.department === officer.departmentCode) &&
        t.status !== TASK_STATUS.COMPLETED
      );
      if (deptTask) {
        deptTask.status = TASK_STATUS.FAILED;
        deptTask.error = reason.trim();
        updateTaskDependencies(orch.tasks);
        orch.status = ORCHESTRATION_STATUS.FAILED;
        orch.updatedAt = now;
      }
    }
  }

  return app;
}

/**
 * Completes and fulfills an approved application
 */
export function completeApplication(officer, applicationId, { certificateUrl = null, remarks = '' } = {}) {
  const app = getRawApplication(officer, applicationId);

  if (app.status !== 'APPROVED') {
    throw new OfficerWorkflowError(`Only approved applications can be completed. Current status: ${app.status}`, 400, 'NOT_APPROVED');
  }

  const now = new Date().toISOString();
  app.status = 'COMPLETED';
  app.currentStage = 'Service Fulfilled & Digital Certificate Dispatched';
  app.version = (app.version || 1) + 1;
  app.completedAt = now;
  app.updatedAt = now;
  if (certificateUrl) app.certificateUrl = certificateUrl;

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'COMPLETED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Service delivery fulfilled and closed by ${officer.name}. ${remarks}`
  });

  return app;
}

/**
 * Computes workload statistics for the officer's department
 */
export function getDepartmentWorkload(officer) {
  if (!officer || officer.role !== 'OFFICER' || !officer.departmentCode) {
    throw new OfficerWorkflowError('Access Denied: Valid officer session required.', 403, 'UNAUTHORIZED_ROLE');
  }

  const apps = db.getDepartmentalApplications(officer.departmentCode).map(ensureWorkflowFields);

  const stats = {
    total: apps.length,
    pending: 0,
    underReview: 0,
    clarificationRequired: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    claimedByMe: 0
  };

  for (const a of apps) {
    if (a.assignedOfficerId === officer.id) stats.claimedByMe += 1;

    switch (a.status) {
      case 'SUBMITTED':
      case 'PENDING':
      case 'PENDING_REVIEW':
      case 'VERIFICATION_PENDING':
      case 'ORCHESTRATING':
        stats.pending += 1;
        break;
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
        stats.underReview += 1;
        break;
      case 'CLARIFICATION_REQUIRED':
        stats.clarificationRequired += 1;
        break;
      case 'APPROVED':
        stats.approved += 1;
        break;
      case 'REJECTED':
        stats.rejected += 1;
        break;
      case 'COMPLETED':
        stats.completed += 1;
        break;
      default:
        stats.pending += 1;
    }
  }

  return {
    departmentCode: officer.departmentCode,
    officerId: officer.id,
    officerName: officer.name,
    stats
  };
}
