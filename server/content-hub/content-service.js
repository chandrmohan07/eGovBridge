/**
 * SIH Government Service Integration Platform — Content Hub Service
 * Manages scholarships, government schemes, announcements, user bookmarks,
 * approaching deadline checks, and Service Catalog & Document Vault cross-references.
 */

import { db } from '../db.js';
import { activeContentSource } from './sources/content-source.js';

export class ContentHubError extends Error {
  constructor(message, statusCode = 400, code = 'CONTENT_HUB_ERROR') {
    super(message);
    this.name = 'ContentHubError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Enriches scholarship or scheme with deadline status, bookmark flag, and vault status
 */
function enrichItem(item, type, user = null) {
  const now = Date.now();
  const deadlineMs = item.deadline ? new Date(item.deadline).getTime() : 0;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const isExpired = deadlineMs > 0 && deadlineMs < now;
  const closingSoon = !isExpired && deadlineMs > 0 && (deadlineMs - now) <= sevenDaysMs;

  let isSaved = false;
  let vaultStatus = [];

  if (user && user.id) {
    const savedSet = db.savedHubItems?.get(user.id) || new Set();
    isSaved = savedSet.has(`${type}:${item.id}`);

    // Cross-check citizen vault for required documents
    const userDocs = db.getUserVaultDocuments ? db.getUserVaultDocuments(user.id) : [];
    const docTypesInVault = new Set(userDocs.map(d => d.documentType));

    if (Array.isArray(item.requiredDocuments)) {
      vaultStatus = item.requiredDocuments.map(reqDoc => {
        const found = userDocs.some(d => 
          d.name.toLowerCase().includes(reqDoc.toLowerCase()) || 
          d.documentType.toLowerCase().includes(reqDoc.toLowerCase())
        );
        return {
          documentName: reqDoc,
          availableInVault: found
        };
      });
    }
  }

  // Cross-reference with existing Service Catalog
  let relatedService = null;
  if (item.relatedServiceId) {
    relatedService = db.getServiceById ? db.getServiceById(item.relatedServiceId) : null;
  }

  return {
    ...item,
    isExpired,
    closingSoon,
    isSaved,
    vaultStatus,
    relatedService: relatedService ? {
      id: relatedService.id,
      title: relatedService.title,
      department: relatedService.department,
      canApplyOnline: true
    } : null,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION'
  };
}

// -----------------------------------------------------------------
// SCHOLARSHIPS API
// -----------------------------------------------------------------

export function listScholarships(filters = {}, user = null) {
  const result = db.getScholarships(filters);
  const enriched = result.scholarships.map(s => enrichItem(s, 'scholarship', user));

  return {
    success: true,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION',
    source: 'National Scholarship Portal (NSP)',
    scholarships: enriched
  };
}

export function getScholarshipById(id, user = null) {
  const item = db.getScholarshipById(id);
  if (!item) {
    throw new ContentHubError(`Scholarship not found: ${id}`, 404, 'NOT_FOUND');
  }
  return {
    success: true,
    scholarship: enrichItem(item, 'scholarship', user)
  };
}

export function saveScholarship(user, id) {
  if (!user || !user.id) {
    throw new ContentHubError('Authentication required to save scholarships', 401, 'UNAUTHORIZED');
  }
  const item = db.getScholarshipById(id);
  if (!item) {
    throw new ContentHubError(`Scholarship not found: ${id}`, 404, 'NOT_FOUND');
  }

  db.saveHubItem(user.id, 'scholarship', id);
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'SCHOLARSHIP_SAVED',
    details: `Citizen saved scholarship ${id} (${item.title})`
  });

  return { success: true, message: 'Scholarship saved successfully', id };
}

export function removeSavedScholarship(user, id) {
  if (!user || !user.id) {
    throw new ContentHubError('Authentication required to modify saved scholarships', 401, 'UNAUTHORIZED');
  }
  db.removeHubItem(user.id, 'scholarship', id);
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'SCHOLARSHIP_REMOVED',
    details: `Citizen removed saved scholarship ${id}`
  });

  return { success: true, message: 'Scholarship removed from saved list', id };
}

export function getSavedScholarships(user) {
  if (!user || !user.id) {
    throw new ContentHubError('Authentication required to view saved scholarships', 401, 'UNAUTHORIZED');
  }
  const list = db.getUserSavedHubItems(user.id, 'scholarship');
  const enriched = list.map(s => enrichItem(s, 'scholarship', user));
  return { success: true, total: enriched.length, scholarships: enriched };
}

export function createScholarship(adminUser, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can create scholarships', 403, 'FORBIDDEN');
  }
  if (!data.title && !data.name) {
    throw new ContentHubError('Scholarship title is required', 400, 'INVALID_TITLE');
  }
  if (!data.deadline) {
    throw new ContentHubError('Scholarship deadline is required', 400, 'INVALID_DEADLINE');
  }
  const created = db.createScholarship(data);
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'SCHOLARSHIP_CREATED',
    details: `Admin created scholarship ${created.id} (${created.title})`
  });
  return { success: true, scholarship: created };
}

export function updateScholarship(adminUser, id, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can update scholarships', 403, 'FORBIDDEN');
  }
  const updated = db.updateScholarship(id, data);
  if (!updated) {
    throw new ContentHubError(`Scholarship not found: ${id}`, 404, 'NOT_FOUND');
  }
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'SCHOLARSHIP_UPDATED',
    details: `Admin updated scholarship ${id}`
  });
  return { success: true, scholarship: updated };
}

export function deleteScholarship(adminUser, id) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can deactivate scholarships', 403, 'FORBIDDEN');
  }
  const success = db.deleteScholarship(id);
  if (!success) {
    throw new ContentHubError(`Scholarship not found: ${id}`, 404, 'NOT_FOUND');
  }
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'SCHOLARSHIP_DEACTIVATED',
    details: `Admin deactivated scholarship ${id}`
  });
  return { success: true, message: `Scholarship ${id} deactivated` };
}

// -----------------------------------------------------------------
// GOVERNMENT SCHEMES API
// -----------------------------------------------------------------

export function listSchemes(filters = {}, user = null) {
  const result = db.getSchemes(filters);
  const enriched = result.schemes.map(s => enrichItem(s, 'scheme', user));

  return {
    success: true,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION',
    source: 'myScheme Portal',
    schemes: enriched
  };
}

export function getSchemeById(id, user = null) {
  const item = db.getSchemeById(id);
  if (!item) {
    throw new ContentHubError(`Government scheme not found: ${id}`, 404, 'NOT_FOUND');
  }
  return {
    success: true,
    scheme: enrichItem(item, 'scheme', user)
  };
}

export function saveScheme(user, id) {
  if (!user || !user.id) {
    throw new ContentHubError('Authentication required to save schemes', 401, 'UNAUTHORIZED');
  }
  const item = db.getSchemeById(id);
  if (!item) {
    throw new ContentHubError(`Government scheme not found: ${id}`, 404, 'NOT_FOUND');
  }

  db.saveHubItem(user.id, 'scheme', id);
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'SCHEME_SAVED',
    details: `Citizen saved government scheme ${id} (${item.title})`
  });

  return { success: true, message: 'Scheme saved successfully', id };
}

export function removeSavedScheme(user, id) {
  if (!user || !user.id) {
    throw new ContentHubError('Authentication required to modify saved schemes', 401, 'UNAUTHORIZED');
  }
  db.removeHubItem(user.id, 'scheme', id);
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'SCHEME_REMOVED',
    details: `Citizen removed saved scheme ${id}`
  });

  return { success: true, message: 'Scheme removed from saved list', id };
}

export function getSavedSchemes(user) {
  if (!user || !user.id) {
    throw new ContentHubError('Authentication required to view saved schemes', 401, 'UNAUTHORIZED');
  }
  const list = db.getUserSavedHubItems(user.id, 'scheme');
  const enriched = list.map(s => enrichItem(s, 'scheme', user));
  return { success: true, total: enriched.length, schemes: enriched };
}

export function createScheme(adminUser, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can create government schemes', 403, 'FORBIDDEN');
  }
  if (!data.title && !data.name) {
    throw new ContentHubError('Scheme title is required', 400, 'INVALID_TITLE');
  }
  if (!data.benefits) {
    throw new ContentHubError('Scheme benefits description is required', 400, 'INVALID_BENEFITS');
  }
  const created = db.createScheme(data);
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'SCHEME_CREATED',
    details: `Admin created government scheme ${created.id} (${created.title})`
  });
  return { success: true, scheme: created };
}

export function updateScheme(adminUser, id, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can update government schemes', 403, 'FORBIDDEN');
  }
  const updated = db.updateScheme(id, data);
  if (!updated) {
    throw new ContentHubError(`Scheme not found: ${id}`, 404, 'NOT_FOUND');
  }
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'SCHEME_UPDATED',
    details: `Admin updated scheme ${id}`
  });
  return { success: true, scheme: updated };
}

export function deleteScheme(adminUser, id) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can deactivate government schemes', 403, 'FORBIDDEN');
  }
  const success = db.deleteScheme(id);
  if (!success) {
    throw new ContentHubError(`Scheme not found: ${id}`, 404, 'NOT_FOUND');
  }
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'SCHEME_DEACTIVATED',
    details: `Admin deactivated scheme ${id}`
  });
  return { success: true, message: `Scheme ${id} deactivated` };
}

// -----------------------------------------------------------------
// ANNOUNCEMENTS & NEWS API
// -----------------------------------------------------------------

export function listAnnouncements(filters = {}) {
  const result = db.getAnnouncements(filters);
  const now = new Date().toISOString().slice(0, 10);

  const enriched = result.announcements.map(a => ({
    ...a,
    isExpired: a.expiryDate ? a.expiryDate < now : false,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION'
  }));

  return {
    success: true,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION',
    source: 'Press Information Bureau (PIB)',
    announcements: enriched
  };
}

export function getAnnouncementById(id) {
  const item = db.getAnnouncementById(id);
  if (!item) {
    throw new ContentHubError(`Announcement not found: ${id}`, 404, 'NOT_FOUND');
  }
  const now = new Date().toISOString().slice(0, 10);
  return {
    success: true,
    announcement: {
      ...item,
      isExpired: item.expiryDate ? item.expiryDate < now : false,
      disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION'
    }
  };
}

export function createAnnouncement(adminUser, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can create announcements', 403, 'FORBIDDEN');
  }
  if (!data.title) {
    throw new ContentHubError('Announcement title is required', 400, 'INVALID_TITLE');
  }
  const created = db.createAnnouncement(data);
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'ANNOUNCEMENT_CREATED',
    details: `Admin created announcement ${created.id}`
  });
  return { success: true, announcement: created };
}

export function updateAnnouncement(adminUser, id, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can update announcements', 403, 'FORBIDDEN');
  }
  const updated = db.updateAnnouncement(id, data);
  if (!updated) {
    throw new ContentHubError(`Announcement not found: ${id}`, 404, 'NOT_FOUND');
  }
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'ANNOUNCEMENT_UPDATED',
    details: `Admin updated announcement ${id}`
  });
  return { success: true, announcement: updated };
}

export function deleteAnnouncement(adminUser, id) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new ContentHubError('Only administrators can archive announcements', 403, 'FORBIDDEN');
  }
  const success = db.deleteAnnouncement(id);
  if (!success) {
    throw new ContentHubError(`Announcement not found: ${id}`, 404, 'NOT_FOUND');
  }
  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'ANNOUNCEMENT_ARCHIVED',
    details: `Admin archived announcement ${id}`
  });
  return { success: true, message: `Announcement ${id} archived` };
}
