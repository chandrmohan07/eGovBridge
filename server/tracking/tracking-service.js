/**
 * SIH Government Service Integration Platform — Application Tracking Service
 * Aggregates real-time lifecycle progress, safe timeline events, clarification responses,
 * high-level orchestration milestones, and citizen-safe status views.
 */

import crypto from 'node:crypto';
import { db } from '../db.js';
import { ensureWorkflowFields } from '../officer/officer-workflow.js';

export class TrackingError extends Error {
  constructor(message, statusCode = 400, code = 'TRACKING_ERROR') {
    super(message);
    this.name = 'TrackingError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Maps application status to estimated completion percentage for visual progress bars
 */
export function calculateProgressPercentage(status) {
  switch (status) {
    case 'DRAFT': return 10;
    case 'SUBMITTED': return 25;
    case 'RECEIVED': return 35;
    case 'ASSIGNED':
    case 'UNDER_REVIEW':
    case 'IN_PROGRESS': return 50;
    case 'VERIFICATION_REQUIRED':
    case 'CLARIFICATION_REQUIRED': return 65;
    case 'PROCESSING': return 80;
    case 'APPROVED': return 90;
    case 'COMPLETED': return 100;
    case 'REJECTED':
    case 'FAILED': return 100;
    default: return 25;
  }
}

/**
 * Produces safe high-level workflow milestones from Phase 6 Orchestration tasks
 * without exposing technical internal adapter code or private tokens.
 */
export function deriveSafeOrchestrationMilestones(orchestration) {
  if (!orchestration || !Array.isArray(orchestration.tasks)) {
    return [
      { name: 'Application Submission', status: 'COMPLETED' },
      { name: 'Document & Eligibility Verification', status: 'IN_PROGRESS' },
      { name: 'Department Officer Scrutiny', status: 'PENDING' },
      { name: 'Service Issuance & Completion', status: 'PENDING' }
    ];
  }

  return orchestration.tasks.map(t => {
    let cleanName = t.title;
    if (t.code === 'TASK_IDENTITY_VERIFY') cleanName = 'Aadhaar & DigiLocker e-KYC Verification';
    else if (t.code === 'TASK_ACADEMIC_RECORD') cleanName = 'Academic Enrollment Verification';
    else if (t.code === 'TASK_REVENUE_INCOME_CHECK') cleanName = 'Income & Eligibility Verification';
    else if (t.code === 'TASK_OFFICER_NODAL_REVIEW') cleanName = 'Department Officer Final Determination';
    else if (t.code === 'TASK_PFMS_DISBURSEMENT') cleanName = 'Direct Benefit Transfer Banking Authorization';

    return {
      title: cleanName,
      department: t.department || 'Government Nodal Agency',
      status: t.status,
      completed: t.status === 'COMPLETED'
    };
  });
}

/**
 * Retrieves comprehensive tracking detail for an application, enforcing privacy and RBAC
 */
export function getApplicationTracking(user, applicationId) {
  if (!user || !user.id) {
    throw new TrackingError('Authentication required to track application', 401, 'UNAUTHENTICATED');
  }

  const app = db.getApplicationById(applicationId);
  if (!app) {
    throw new TrackingError(`Application not found with ID: ${applicationId}`, 404, 'NOT_FOUND');
  }

  // Security Check: Citizen must own application; Officer must belong to department; Admin has global access
  if (user.role === 'CITIZEN' && app.applicantId !== user.id) {
    throw new TrackingError('Access Denied: You do not have permission to view this application tracking record', 403, 'FORBIDDEN');
  }
  if (user.role === 'OFFICER' && app.departmentCode !== user.departmentCode) {
    throw new TrackingError('Access Denied: Officer cannot access applications outside assigned department', 403, 'FORBIDDEN');
  }

  ensureWorkflowFields(app);

  // Safe timeline: Strip sensitive internal details, preserve citizen-visible messages
  const safeTimeline = (app.timeline || []).map(t => ({
    id: t.id,
    event: t.event,
    actorRole: t.role || 'GOVERNMENT_SYSTEM',
    timestamp: t.timestamp,
    description: t.description
  }));

  // Safe pending clarifications
  const pendingClarifications = (app.clarifications || []).filter(c => c.status === 'PENDING').map(c => ({
    clarificationId: c.clarificationId,
    requestedInfo: c.requestedInfo,
    reason: c.reason,
    createdAt: c.createdAt,
    status: c.status
  }));

  // Resolved clarifications history
  const resolvedClarifications = (app.clarifications || []).filter(c => c.status === 'RESOLVED').map(c => ({
    clarificationId: c.clarificationId,
    requestedInfo: c.requestedInfo,
    citizenResponse: c.citizenResponse,
    createdAt: c.createdAt,
    resolvedAt: c.resolvedAt
  }));

  // Fetch linked Orchestration milestones
  let orchestrationMilestones = null;
  if (app.orchestrationId) {
    const orch = db.getOrchestrationById(app.orchestrationId);
    if (orch) {
      orchestrationMilestones = deriveSafeOrchestrationMilestones(orch);
    }
  }

  const progressPercent = calculateProgressPercentage(app.status);

  // Sanitized citizen-safe tracking record (Zero internal notes or private officer PII)
  return {
    applicationId: app.id,
    serviceId: app.serviceId,
    serviceName: app.serviceName,
    departmentId: app.departmentId,
    departmentCode: app.departmentCode,
    applicantName: app.applicantName,
    status: app.status,
    currentStage: app.currentStage,
    progressPercentage: progressPercent,
    submittedDate: app.submittedDate,
    submittedAt: app.submittedAt,
    updatedAt: app.updatedAt,
    completedAt: app.completedAt || null,
    certificateUrl: app.certificateUrl || null,
    decision: app.decision ? {
      verdict: app.decision.verdict,
      remarks: app.decision.remarks,
      reason: app.decision.reason,
      decidedAt: app.decision.decidedAt
    } : null,
    timeline: safeTimeline,
    pendingClarifications,
    resolvedClarifications,
    orchestrationMilestones,
    documentsCount: Array.isArray(app.documents) ? app.documents.length : 0
  };
}

/**
 * Citizen responds to an open clarification request with message or uploaded documents
 */
export function respondToClarification(user, applicationId, { clarificationId, responseMessage, documents = [] }) {
  if (!user || user.role !== 'CITIZEN') {
    throw new TrackingError('Only citizens can submit clarification responses', 403, 'FORBIDDEN');
  }

  if (!responseMessage || String(responseMessage).trim().length < 5) {
    throw new TrackingError('Clarification response message is required (minimum 5 characters)', 400, 'INVALID_RESPONSE');
  }

  const app = db.getApplicationById(applicationId);
  if (!app) {
    throw new TrackingError(`Application not found with ID: ${applicationId}`, 404, 'NOT_FOUND');
  }

  if (app.applicantId !== user.id) {
    throw new TrackingError('Access Denied: You do not own this application', 403, 'FORBIDDEN');
  }

  ensureWorkflowFields(app);

  if (app.status !== 'CLARIFICATION_REQUIRED') {
    throw new TrackingError(`Cannot submit clarification for application in status: ${app.status}`, 400, 'INVALID_STATUS');
  }

  // Find clarification
  const clarification = app.clarifications.find(c => c.clarificationId === clarificationId && c.status === 'PENDING');
  if (!clarification) {
    throw new TrackingError(`Pending clarification request not found: ${clarificationId}`, 404, 'CLARIFICATION_NOT_FOUND');
  }

  const now = new Date().toISOString();
  clarification.status = 'RESOLVED';
  clarification.resolvedAt = now;
  clarification.citizenResponse = responseMessage.trim();

  // Attach any new supplementary documents
  if (Array.isArray(documents) && documents.length > 0) {
    app.documents = app.documents.concat(documents);
  }

  // Transition status back to UNDER_REVIEW
  app.status = 'UNDER_REVIEW';
  app.currentStage = 'Citizen Clarification Submitted — Under Officer Re-Evaluation';
  app.version = (app.version || 1) + 1;
  app.updatedAt = now;

  app.timeline.unshift({
    id: `TL-${crypto.randomBytes(3).toString('hex')}`,
    event: 'CLARIFICATION_SUBMITTED',
    actor: user.name || 'Citizen',
    role: 'CITIZEN',
    timestamp: now,
    description: `Citizen submitted clarification: "${responseMessage.trim().slice(0, 100)}..."`
  });

  return {
    success: true,
    message: 'Clarification response recorded successfully. Application returned to officer review queue.',
    application: app,
    clarification
  };
}

/**
 * Retrieves list of applications for authenticated citizen with multi-facet filters
 */
export function getCitizenApplications(user, filters = {}) {
  if (!user || user.role !== 'CITIZEN') {
    throw new TrackingError('Access Denied: Citizen session required', 403, 'UNAUTHORIZED_ROLE');
  }

  const apps = db.getCitizenApplications(user.id).map(ensureWorkflowFields);

  let filtered = apps;

  // Filter by status
  if (filters.status && filters.status !== 'ALL') {
    const s = filters.status.toUpperCase();
    filtered = filtered.filter(a => a.status === s);
  }

  // Filter by department
  if (filters.department && filters.department !== 'ALL') {
    const d = filters.department.toUpperCase();
    filtered = filtered.filter(a => a.departmentCode === d);
  }

  // Search query (applicationId or serviceName)
  if (filters.search) {
    const q = String(filters.search).toLowerCase().trim();
    filtered = filtered.filter(a => 
      (a.id && a.id.toLowerCase().includes(q)) ||
      (a.serviceName && a.serviceName.toLowerCase().includes(q))
    );
  }

  // Return sanitized summaries (no internal notes or confidential server internals)
  return filtered.map(a => ({
    id: a.id,
    serviceId: a.serviceId,
    serviceName: a.serviceName,
    departmentCode: a.departmentCode,
    status: a.status,
    currentStage: a.currentStage,
    progressPercentage: calculateProgressPercentage(a.status),
    submittedDate: a.submittedDate,
    updatedAt: a.updatedAt || a.submittedDate,
    hasPendingClarification: (a.clarifications || []).some(c => c.status === 'PENDING')
  }));
}
