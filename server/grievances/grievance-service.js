/**
 * SIH Government Service Integration Platform — Feedback & Grievance System
 * End-to-end citizen grievance registration, departmental claim/review,
 * clarification cycle, resolution/rejection workflows, and service feedback.
 */

import crypto from 'node:crypto';
import { db, DEPARTMENTS } from '../db.js';
import { createNotification } from '../notifications/index.js';

export class GrievanceError extends Error {
  constructor(message, statusCode = 400, code = 'GRIEVANCE_ERROR') {
    super(message);
    this.name = 'GrievanceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const GRIEVANCE_STATUS = {
  SUBMITTED: 'SUBMITTED',
  RECEIVED: 'RECEIVED',
  ASSIGNED: 'ASSIGNED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CLARIFICATION_REQUIRED: 'CLARIFICATION_REQUIRED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED'
};

export const GRIEVANCE_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

export const GRIEVANCE_CATEGORIES = [
  { id: 'SERVICE_DELAY', name: 'Service Delay', description: 'Turnaround time exceeded for service delivery' },
  { id: 'APPLICATION_ISSUE', name: 'Application Issue', description: 'Difficulty submitting, tracking, or updating an application' },
  { id: 'DOCUMENT_ISSUE', name: 'Document Issue', description: 'Problems with document verification, DigiLocker, or vault linking' },
  { id: 'TECHNICAL_PROBLEM', name: 'Technical Problem', description: 'Portal errors, gateway timeouts, or system glitches' },
  { id: 'OFFICER_DEPARTMENT_ISSUE', name: 'Officer / Department Issue', description: 'Unresponsive department staff or procedural irregularities' },
  { id: 'PAYMENT_ISSUE', name: 'Payment Issue', description: 'Statutory fee deduction or transaction failure' },
  { id: 'INFORMATION_REQUEST', name: 'Information Request', description: 'Lack of clarity regarding eligibility or required certificates' },
  { id: 'OTHER', name: 'Other', description: 'General grievances and citizen concerns' }
];

/**
 * Safe notification helper that swallows dispatch errors to prevent breaking core workflows
 */
async function safeNotify(recipientUserId, type, title, message, metadata = {}) {
  try {
    await createNotification({
      recipientUserId,
      recipientRole: 'CITIZEN',
      type: type || 'SYSTEM_ANNOUNCEMENT',
      title,
      message,
      priority: metadata.priority === 'HIGH' || metadata.priority === 'URGENT' ? 'HIGH' : 'NORMAL',
      metadata
    });
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Strips officer internal notes and sensitive operational details before returning to citizen
 */
export function sanitizeGrievanceForCitizen(grievance) {
  if (!grievance) return null;
  const clone = { ...grievance };
  delete clone.internalNotes;
  return clone;
}

// -----------------------------------------------------------------
// CITIZEN WORKFLOWS
// -----------------------------------------------------------------

/**
 * Registers a new citizen grievance
 */
export async function createGrievance(user, data) {
  if (!user || !user.id) {
    throw new GrievanceError('Authentication required to submit a grievance', 401, 'UNAUTHORIZED');
  }

  if (!data.departmentId) {
    throw new GrievanceError('Department selection is required', 400, 'MISSING_DEPARTMENT');
  }

  const dept = (DEPARTMENTS || []).find(d => d.id === data.departmentId || d.code === data.departmentId);
  if (!dept) {
    throw new GrievanceError(`Department '${data.departmentId}' not found`, 404, 'DEPARTMENT_NOT_FOUND');
  }

  if (!data.subject || data.subject.trim().length < 5) {
    throw new GrievanceError('Subject must be at least 5 characters long', 400, 'INVALID_SUBJECT');
  }

  if (!data.description || data.description.trim().length < 15) {
    throw new GrievanceError('Description must be at least 15 characters long', 400, 'INVALID_DESCRIPTION');
  }

  // Validate optional application reference
  let appRecord = null;
  if (data.applicationId) {
    appRecord = db.getApplicationById ? db.getApplicationById(data.applicationId) : null;
    if (!appRecord) {
      throw new GrievanceError(`Application '${data.applicationId}' not found`, 404, 'APPLICATION_NOT_FOUND');
    }
    // Citizen can only link their own application
    if (user.role === 'CITIZEN' && appRecord.applicantId && appRecord.applicantId !== user.id) {
      throw new GrievanceError('You can only register grievances against your own applications', 403, 'FORBIDDEN');
    }
  }

  // Validate and link supporting documents from Phase 13 Vault
  const supportingDocs = [];
  if (Array.isArray(data.supportingDocumentIds) && data.supportingDocumentIds.length > 0) {
    const userDocs = db.getVaultDocuments ? db.getVaultDocuments(user.id) : [];
    for (const docId of data.supportingDocumentIds) {
      const doc = userDocs.find(d => d.id === docId);
      if (!doc) {
        throw new GrievanceError(`Supporting document '${docId}' not found in your vault`, 400, 'INVALID_DOCUMENT');
      }
      supportingDocs.push({
        id: doc.id,
        name: doc.originalName || doc.name || doc.documentName || doc.fileName,
        documentType: doc.documentType,
        fileUrl: `/api/v1/vault/documents/${doc.id}/download`
      });
    }
  }

  const newGrievance = db.createGrievance({
    citizenId: user.id,
    citizenName: user.name,
    citizenEmail: user.email,
    citizenPhone: user.phone || '',
    departmentId: dept.id,
    departmentCode: dept.code,
    category: data.category || 'Other',
    subject: data.subject.trim(),
    description: data.description.trim(),
    priority: (data.priority || 'MEDIUM').toUpperCase(),
    applicationId: appRecord ? appRecord.id : (data.applicationId || null),
    serviceId: appRecord ? appRecord.serviceId : (data.serviceId || null),
    serviceTitle: appRecord ? (appRecord.serviceTitle || appRecord.serviceName) : (data.serviceTitle || null),
    supportingDocuments: supportingDocs
  });

  // Audit log
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'GRIEVANCE_CREATED',
    details: `Citizen registered grievance ${newGrievance.id} for department ${dept.name}`
  });

  // Safe notification to citizen
  await safeNotify(
    user.id,
    'SYSTEM_ANNOUNCEMENT',
    'Grievance Registered',
    `Your grievance #${newGrievance.id} has been registered and assigned to ${dept.name}.`,
    { grievanceId: newGrievance.id, department: dept.name }
  );

  return {
    success: true,
    message: 'Grievance submitted successfully',
    grievance: sanitizeGrievanceForCitizen(newGrievance)
  };
}

/**
 * Retrieves a grievance by ID with strict RBAC sanitization
 */
export function getGrievanceById(user, id) {
  if (!user || !user.id) {
    throw new GrievanceError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  // RBAC checks
  if (user.role === 'CITIZEN') {
    if (grievance.citizenId !== user.id) {
      throw new GrievanceError('Access denied: You do not have permission to view this grievance', 403, 'FORBIDDEN');
    }
    return {
      success: true,
      grievance: sanitizeGrievanceForCitizen(grievance)
    };
  }

  if (user.role === 'OFFICER') {
    if (user.departmentId && grievance.departmentId !== user.departmentId && grievance.departmentCode !== user.departmentCode) {
      throw new GrievanceError(`Access denied: Grievance belongs to ${grievance.departmentCode}, not your department`, 403, 'FORBIDDEN');
    }
    return {
      success: true,
      grievance
    };
  }

  if (user.role === 'ADMIN') {
    return {
      success: true,
      grievance
    };
  }

  throw new GrievanceError('Access denied', 403, 'FORBIDDEN');
}

/**
 * Lists grievances with RBAC filtering
 */
export function listGrievances(user, filters = {}) {
  if (!user || !user.id) {
    throw new GrievanceError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const queryFilters = { ...filters };

  if (user.role === 'CITIZEN') {
    // Citizens strictly see only their own grievances
    queryFilters.citizenId = user.id;
    const result = db.getGrievances(queryFilters);
    return {
      success: true,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      grievances: result.grievances.map(sanitizeGrievanceForCitizen)
    };
  }

  if (user.role === 'OFFICER') {
    // Officers strictly see grievances assigned to their department
    if (user.departmentId) {
      queryFilters.departmentId = user.departmentId;
    }
    const result = db.getGrievances(queryFilters);
    return {
      success: true,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      grievances: result.grievances
    };
  }

  if (user.role === 'ADMIN') {
    const result = db.getGrievances(queryFilters);
    return {
      success: true,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      grievances: result.grievances
    };
  }

  throw new GrievanceError('Access denied', 403, 'FORBIDDEN');
}

// -----------------------------------------------------------------
// OFFICER WORKFLOWS
// -----------------------------------------------------------------

/**
 * Officer claims/assigns a grievance for review
 */
export async function claimGrievance(officer, id) {
  if (!officer || (officer.role !== 'OFFICER' && officer.role !== 'ADMIN')) {
    throw new GrievanceError('Only departmental officers can claim grievances', 403, 'FORBIDDEN');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (officer.role === 'OFFICER' && officer.departmentId && grievance.departmentId !== officer.departmentId && grievance.departmentCode !== officer.departmentCode) {
    throw new GrievanceError(`Cannot claim grievance belonging to another department (${grievance.departmentCode})`, 403, 'FORBIDDEN');
  }

  if (grievance.status === GRIEVANCE_STATUS.RESOLVED || grievance.status === GRIEVANCE_STATUS.REJECTED || grievance.status === GRIEVANCE_STATUS.CLOSED) {
    throw new GrievanceError(`Cannot claim grievance in ${grievance.status} status`, 400, 'INVALID_STATUS_TRANSITION');
  }

  const now = new Date().toISOString();
  grievance.assignedOfficerId = officer.id;
  grievance.assignedOfficerName = officer.name;
  grievance.status = GRIEVANCE_STATUS.UNDER_REVIEW;
  grievance.updatedAt = now;
  grievance.version = (grievance.version || 1) + 1;

  grievance.timeline.push({
    id: `TL-GRV-${crypto.randomBytes(3).toString('hex')}`,
    event: 'ASSIGNED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Grievance claimed by ${officer.name} for departmental investigation.`
  });

  db.recordVaultAudit({
    actorId: officer.id,
    actorRole: officer.role,
    action: 'GRIEVANCE_ASSIGNED',
    details: `Officer ${officer.name} claimed grievance ${grievance.id}`
  });

  await safeNotify(
    grievance.citizenId,
    'SYSTEM_ANNOUNCEMENT',
    'Grievance Claimed for Review',
    `Officer ${officer.name} has claimed your grievance #${grievance.id} and is actively investigating.`,
    { grievanceId: grievance.id, officerName: officer.name }
  );

  return {
    success: true,
    message: `Grievance ${grievance.id} claimed successfully`,
    grievance
  };
}

/**
 * Officer adds an internal investigation note (strictly shielded from citizens)
 */
export function addGrievanceInternalNote(officer, id, noteText) {
  if (!officer || (officer.role !== 'OFFICER' && officer.role !== 'ADMIN')) {
    throw new GrievanceError('Only authorized officers can add internal notes', 403, 'FORBIDDEN');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (officer.role === 'OFFICER' && officer.departmentId && grievance.departmentId !== officer.departmentId && grievance.departmentCode !== officer.departmentCode) {
    throw new GrievanceError('Access denied for this department grievance', 403, 'FORBIDDEN');
  }

  if (!noteText || noteText.trim().length < 3) {
    throw new GrievanceError('Note text must be at least 3 characters', 400, 'INVALID_NOTE');
  }

  const note = {
    noteId: `NOTE-GRV-${crypto.randomBytes(3).toString('hex')}`,
    officerId: officer.id,
    officerName: officer.name,
    note: noteText.trim(),
    timestamp: new Date().toISOString()
  };

  grievance.internalNotes.push(note);
  grievance.updatedAt = new Date().toISOString();
  grievance.version = (grievance.version || 1) + 1;

  db.recordVaultAudit({
    actorId: officer.id,
    actorRole: officer.role,
    action: 'GRIEVANCE_INTERNAL_NOTE_ADDED',
    details: `Internal note added to grievance ${grievance.id}`
  });

  return {
    success: true,
    message: 'Internal note added',
    note
  };
}
export const addInternalNote = addGrievanceInternalNote;

/**
 * Officer requests clarification from citizen
 */
export async function requestGrievanceClarification(officer, id, question) {
  if (!officer || (officer.role !== 'OFFICER' && officer.role !== 'ADMIN')) {
    throw new GrievanceError('Only authorized officers can request clarification', 403, 'FORBIDDEN');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (officer.role === 'OFFICER' && officer.departmentId && grievance.departmentId !== officer.departmentId && grievance.departmentCode !== officer.departmentCode) {
    throw new GrievanceError('Access denied for this department grievance', 403, 'FORBIDDEN');
  }

  if (!question || question.trim().length < 10) {
    throw new GrievanceError('Clarification question must be at least 10 characters long', 400, 'INVALID_QUESTION');
  }

  const now = new Date().toISOString();
  const clarId = `CLR-GRV-${crypto.randomBytes(3).toString('hex')}`;

  grievance.status = GRIEVANCE_STATUS.CLARIFICATION_REQUIRED;
  grievance.clarifications.push({
    clarificationId: clarId,
    question: question.trim(),
    requestedBy: officer.name,
    requestedAt: now,
    response: null,
    respondedAt: null,
    documents: []
  });

  grievance.timeline.push({
    id: `TL-GRV-${crypto.randomBytes(3).toString('hex')}`,
    event: 'CLARIFICATION_REQUESTED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Officer requested clarification: "${question.trim()}"`
  });

  grievance.updatedAt = now;
  grievance.version = (grievance.version || 1) + 1;

  db.recordVaultAudit({
    actorId: officer.id,
    actorRole: officer.role,
    action: 'CLARIFICATION_REQUESTED',
    details: `Officer ${officer.name} requested clarification on grievance ${grievance.id}`
  });

  await safeNotify(
    grievance.citizenId,
    'CLARIFICATION_REQUESTED',
    'Clarification Needed on Grievance',
    `The reviewing officer requested information for grievance #${grievance.id}: "${question.trim()}". Please respond.`,
    { grievanceId: grievance.id, question: question.trim() }
  );

  return {
    success: true,
    message: 'Clarification requested successfully',
    clarificationId: clarId,
    grievance
  };
}
export const requestClarification = requestGrievanceClarification;

/**
 * Citizen responds to clarification, optionally attaching Vault documents
 */
export async function respondToGrievanceClarification(citizen, id, data) {
  if (!citizen || !citizen.id) {
    throw new GrievanceError('Authentication required to submit clarification response', 401, 'UNAUTHORIZED');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (grievance.citizenId !== citizen.id) {
    throw new GrievanceError('Access denied: You cannot respond to another citizen\'s grievance', 403, 'FORBIDDEN');
  }

  if (grievance.status !== GRIEVANCE_STATUS.CLARIFICATION_REQUIRED) {
    throw new GrievanceError(`Cannot submit clarification when grievance status is ${grievance.status}`, 400, 'INVALID_STATUS');
  }

  if (!data.response || data.response.trim().length < 5) {
    throw new GrievanceError('Response text must be at least 5 characters long', 400, 'INVALID_RESPONSE');
  }

  // Validate and link additional vault documents if provided
  const newDocs = [];
  if (Array.isArray(data.documentIds) && data.documentIds.length > 0) {
    const userDocs = db.getVaultDocuments ? db.getVaultDocuments(citizen.id) : [];
    for (const docId of data.documentIds) {
      const doc = userDocs.find(d => d.id === docId);
      if (!doc) {
        throw new GrievanceError(`Supporting document '${docId}' not found in your vault`, 400, 'INVALID_DOCUMENT');
      }
      newDocs.push({
        id: doc.id,
        name: doc.originalName || doc.name || doc.documentName || doc.fileName,
        documentType: doc.documentType,
        fileUrl: `/api/v1/vault/documents/${doc.id}/download`
      });
      // Append to grievance supporting documents
      if (!grievance.supportingDocuments.some(sd => sd.id === doc.id)) {
        grievance.supportingDocuments.push(newDocs[newDocs.length - 1]);
      }
    }
  }

  const now = new Date().toISOString();
  // Find pending clarification record
  const pendingClar = grievance.clarifications.find(c => !c.response);
  if (pendingClar) {
    pendingClar.response = data.response.trim();
    pendingClar.respondedAt = now;
    pendingClar.documents = newDocs;
  }

  grievance.citizenComments.push({
    commentId: `COM-GRV-${crypto.randomBytes(3).toString('hex')}`,
    author: citizen.name,
    comment: data.response.trim(),
    documents: newDocs,
    timestamp: now
  });

  grievance.status = GRIEVANCE_STATUS.IN_PROGRESS;
  grievance.timeline.push({
    id: `TL-GRV-${crypto.randomBytes(3).toString('hex')}`,
    event: 'CLARIFICATION_SUBMITTED',
    actor: citizen.name,
    role: 'CITIZEN',
    timestamp: now,
    description: `Citizen submitted clarification: "${data.response.trim()}"`
  });

  grievance.updatedAt = now;
  grievance.version = (grievance.version || 1) + 1;

  db.recordVaultAudit({
    actorId: citizen.id,
    actorRole: citizen.role,
    action: 'CLARIFICATION_SUBMITTED',
    details: `Citizen submitted clarification on grievance ${grievance.id}`
  });

  return {
    success: true,
    message: 'Clarification response submitted successfully',
    grievance: sanitizeGrievanceForCitizen(grievance)
  };
}
export const respondToClarification = respondToGrievanceClarification;

/**
 * Officer resolves a grievance with documented resolution reason
 */
export async function resolveGrievance(officer, id, data = {}) {
  if (!officer || (officer.role !== 'OFFICER' && officer.role !== 'ADMIN')) {
    throw new GrievanceError('Only authorized officers can resolve grievances', 403, 'FORBIDDEN');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (officer.role === 'OFFICER' && officer.departmentId && grievance.departmentId !== officer.departmentId && grievance.departmentCode !== officer.departmentCode) {
    throw new GrievanceError('Access denied for this department grievance', 403, 'FORBIDDEN');
  }

  if (!data.resolutionReason || data.resolutionReason.trim().length < 10) {
    throw new GrievanceError('Resolution reason must be at least 10 characters long', 400, 'MISSING_RESOLUTION_REASON');
  }

  const now = new Date().toISOString();
  grievance.status = GRIEVANCE_STATUS.RESOLVED;
  grievance.resolutionReason = data.resolutionReason.trim();
  grievance.resolvedAt = now;
  grievance.updatedAt = now;
  grievance.version = (grievance.version || 1) + 1;

  grievance.timeline.push({
    id: `TL-GRV-${crypto.randomBytes(3).toString('hex')}`,
    event: 'RESOLVED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Grievance resolved: "${data.resolutionReason.trim()}"`
  });

  db.recordVaultAudit({
    actorId: officer.id,
    actorRole: officer.role,
    action: 'GRIEVANCE_RESOLVED',
    details: `Officer ${officer.name} resolved grievance ${grievance.id}`
  });

  await safeNotify(
    grievance.citizenId,
    'SYSTEM_ANNOUNCEMENT',
    'Grievance Resolved',
    `Your grievance #${grievance.id} has been resolved: ${data.resolutionReason.trim()}`,
    { grievanceId: grievance.id, resolutionReason: data.resolutionReason.trim() }
  );

  return {
    success: true,
    message: 'Grievance resolved successfully',
    grievance
  };
}

/**
 * Officer rejects a grievance with documented rejection reason
 */
export async function rejectGrievance(officer, id, data = {}) {
  if (!officer || (officer.role !== 'OFFICER' && officer.role !== 'ADMIN')) {
    throw new GrievanceError('Only authorized officers can reject grievances', 403, 'FORBIDDEN');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (officer.role === 'OFFICER' && officer.departmentId && grievance.departmentId !== officer.departmentId && grievance.departmentCode !== officer.departmentCode) {
    throw new GrievanceError('Access denied for this department grievance', 403, 'FORBIDDEN');
  }

  if (!data.rejectionReason || data.rejectionReason.trim().length < 10) {
    throw new GrievanceError('Rejection reason must be at least 10 characters long', 400, 'MISSING_REJECTION_REASON');
  }

  const now = new Date().toISOString();
  grievance.status = GRIEVANCE_STATUS.REJECTED;
  grievance.rejectionReason = data.rejectionReason.trim();
  grievance.updatedAt = now;
  grievance.version = (grievance.version || 1) + 1;

  grievance.timeline.push({
    id: `TL-GRV-${crypto.randomBytes(3).toString('hex')}`,
    event: 'REJECTED',
    actor: officer.name,
    role: 'OFFICER',
    timestamp: now,
    description: `Grievance rejected: "${data.rejectionReason.trim()}"`
  });

  db.recordVaultAudit({
    actorId: officer.id,
    actorRole: officer.role,
    action: 'GRIEVANCE_REJECTED',
    details: `Officer ${officer.name} rejected grievance ${grievance.id}`
  });

  await safeNotify(
    grievance.citizenId,
    'SYSTEM_ANNOUNCEMENT',
    'Grievance Decision: Rejected',
    `Your grievance #${grievance.id} was rejected. Reason: ${data.rejectionReason.trim()}`,
    { grievanceId: grievance.id, rejectionReason: data.rejectionReason.trim() }
  );

  return {
    success: true,
    message: 'Grievance rejected',
    grievance
  };
}

/**
 * Citizen or Officer closes a resolved/rejected grievance
 */
export async function closeGrievance(user, id, data = {}) {
  if (!user || !user.id) {
    throw new GrievanceError('Authentication required to close grievance', 401, 'UNAUTHORIZED');
  }

  const grievance = db.getGrievanceById(id);
  if (!grievance) {
    throw new GrievanceError(`Grievance '${id}' not found`, 404, 'GRIEVANCE_NOT_FOUND');
  }

  if (user.role === 'CITIZEN' && grievance.citizenId !== user.id) {
    throw new GrievanceError('Access denied: You cannot close another citizen\'s grievance', 403, 'FORBIDDEN');
  }

  if (user.role === 'OFFICER' && user.departmentId && grievance.departmentId !== user.departmentId && grievance.departmentCode !== user.departmentCode) {
    throw new GrievanceError('Access denied for this department grievance', 403, 'FORBIDDEN');
  }

  if (grievance.status === GRIEVANCE_STATUS.CLOSED) {
    return {
      success: true,
      message: 'Grievance is already closed',
      grievance: user.role === 'CITIZEN' ? sanitizeGrievanceForCitizen(grievance) : grievance
    };
  }

  const now = new Date().toISOString();
  grievance.status = GRIEVANCE_STATUS.CLOSED;
  grievance.closedAt = now;
  grievance.updatedAt = now;
  grievance.version = (grievance.version || 1) + 1;

  grievance.timeline.push({
    id: `TL-GRV-${crypto.randomBytes(3).toString('hex')}`,
    event: 'CLOSED',
    actor: user.name,
    role: user.role,
    timestamp: now,
    description: data.closingRemarks || 'Grievance closed upon satisfaction or final administrative disposition.'
  });

  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'GRIEVANCE_CLOSED',
    details: `${user.role} ${user.name} closed grievance ${grievance.id}`
  });

  return {
    success: true,
    message: 'Grievance closed successfully',
    grievance: user.role === 'CITIZEN' ? sanitizeGrievanceForCitizen(grievance) : grievance
  };
}

/**
 * Returns timeline events for a grievance
 */
export function getGrievanceTimeline(user, id) {
  const res = getGrievanceById(user, id);
  return {
    success: true,
    grievanceId: id,
    timeline: res.grievance.timeline || []
  };
}

// -----------------------------------------------------------------
// FEEDBACK WORKFLOWS
// -----------------------------------------------------------------

/**
 * Citizen submits service or application feedback
 */
export function submitFeedback(citizen, data) {
  if (!citizen || !citizen.id) {
    throw new GrievanceError('Authentication required to submit feedback', 401, 'UNAUTHORIZED');
  }

  const rating = parseInt(data.rating, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new GrievanceError('Rating must be an integer between 1 and 5', 400, 'INVALID_RATING');
  }

  if (!data.feedbackText || data.feedbackText.trim().length < 5) {
    throw new GrievanceError('Feedback text must be at least 5 characters long', 400, 'INVALID_FEEDBACK_TEXT');
  }

  // Prevent duplicate feedback for same application
  if (data.applicationId) {
    const existing = (db.FEEDBACK || []).find(f => f.citizenId === citizen.id && f.applicationId === data.applicationId);
    if (existing) {
      throw new GrievanceError('Feedback already submitted for this application', 409, 'DUPLICATE_FEEDBACK');
    }
  }

  // Check service existence if serviceId provided
  let serviceTitle = null;
  if (data.serviceId) {
    const srv = (db.SERVICES || []).find(s => s.id === data.serviceId);
    if (srv) serviceTitle = srv.title;
  }

  const fb = db.createFeedback({
    citizenId: citizen.id,
    citizenName: citizen.name,
    serviceId: data.serviceId || null,
    serviceTitle,
    applicationId: data.applicationId || null,
    grievanceId: data.grievanceId || null,
    rating,
    category: data.category || 'General',
    feedbackText: data.feedbackText.trim()
  });

  db.recordVaultAudit({
    actorId: citizen.id,
    actorRole: citizen.role,
    action: 'FEEDBACK_SUBMITTED',
    details: `Citizen submitted ${rating}-star feedback for ${serviceTitle || data.serviceId || 'Platform'}`
  });

  return {
    success: true,
    message: 'Feedback submitted successfully. Thank you for helping improve public services!',
    feedback: fb
  };
}

/**
 * Lists feedback records
 */
export function listFeedback(user, filters = {}) {
  if (!user || !user.id) {
    throw new GrievanceError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const queryFilters = { ...filters };
  if (user.role === 'CITIZEN') {
    queryFilters.citizenId = user.id;
  }

  const result = db.getFeedback(queryFilters);
  return {
    success: true,
    total: result.total,
    feedback: result.feedback
  };
}

// -----------------------------------------------------------------
// ADMIN ANALYTICS
// -----------------------------------------------------------------

/**
 * Aggregates grievance and feedback statistics for administrative monitoring
 */
export function getGrievanceAnalytics(adminUser) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new GrievanceError('Only administrators can view grievance analytics', 403, 'FORBIDDEN');
  }

  const allGrievances = db.grievances || db.GRIEVANCES || [];
  const allFeedback = db.feedback || db.FEEDBACK || [];

  const byStatus = {
    SUBMITTED: 0,
    RECEIVED: 0,
    ASSIGNED: 0,
    UNDER_REVIEW: 0,
    CLARIFICATION_REQUIRED: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    REJECTED: 0,
    CLOSED: 0
  };

  const byDepartment = {};
  const byCategory = {};
  const byPriority = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0
  };

  let totalResolutionTimeMs = 0;
  let resolvedCount = 0;

  for (const g of allGrievances) {
    byStatus[g.status] = (byStatus[g.status] || 0) + 1;
    byPriority[g.priority] = (byPriority[g.priority] || 0) + 1;

    const dept = g.departmentCode || g.departmentId || 'GENERAL';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;

    const cat = g.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    if (g.resolvedAt && g.createdAt) {
      const diff = new Date(g.resolvedAt).getTime() - new Date(g.createdAt).getTime();
      if (diff > 0) {
        totalResolutionTimeMs += diff;
        resolvedCount++;
      }
    }
  }

  const avgResolutionHours = resolvedCount > 0 
    ? (totalResolutionTimeMs / resolvedCount / (1000 * 60 * 60)).toFixed(1)
    : '0.0';

  // Feedback summary
  let totalRating = 0;
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const f of allFeedback) {
    totalRating += f.rating;
    ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
  }
  const avgRating = allFeedback.length > 0 
    ? (totalRating / allFeedback.length).toFixed(1)
    : '0.0';

  return {
    success: true,
    analytics: {
      totalGrievances: allGrievances.length,
      openGrievances: allGrievances.filter(g => g.status !== 'RESOLVED' && g.status !== 'CLOSED' && g.status !== 'REJECTED').length,
      resolvedGrievances: byStatus.RESOLVED || 0,
      rejectedGrievances: byStatus.REJECTED || 0,
      closedGrievances: byStatus.CLOSED || 0,
      pendingClarificationCount: byStatus.CLARIFICATION_REQUIRED || 0,
      averageResolutionHours: avgResolutionHours,
      byStatus,
      byPriority,
      byDepartment,
      byCategory,
      feedbackSummary: {
        totalFeedback: allFeedback.length,
        averageRating: avgRating,
        ratingDistribution
      }
    }
  };
}
