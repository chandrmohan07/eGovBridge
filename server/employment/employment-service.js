/**
 * SIH Government Service Integration Platform — Employment Service
 * Manages job discovery, category filtering, opportunity bookmarking,
 * approaching deadline calculation, recommendation scoring, and administration.
 */

import { db } from '../db.js';
import { activeEmploymentSource } from './sources/employment-source.js';

export class EmploymentError extends Error {
  constructor(message, statusCode = 400, code = 'EMPLOYMENT_ERROR') {
    super(message);
    this.name = 'EmploymentError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Enriches an opportunity with deadline tags and bookmark status
 */
function enrichOpportunity(opp, user = null) {
  const now = Date.now();
  const deadlineMs = opp.deadline ? new Date(opp.deadline).getTime() : 0;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const isExpired = deadlineMs > 0 && deadlineMs < now;
  const closingSoon = !isExpired && deadlineMs > 0 && (deadlineMs - now) <= sevenDaysMs;

  let isSaved = false;
  if (user && user.id) {
    const savedIds = db.savedOpportunities?.get(user.id) || new Set();
    isSaved = savedIds.has(opp.id);
  }

  return {
    ...opp,
    isExpired,
    closingSoon,
    isSaved,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION'
  };
}

/**
 * Lists employment opportunities with rich search, filters, and pagination
 */
export function listOpportunities(filters = {}, user = null) {
  const result = db.getEmploymentOpportunities(filters);
  const enriched = result.opportunities.map(opp => enrichOpportunity(opp, user));

  return {
    success: true,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    disclaimer: 'MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION',
    source: activeEmploymentSource.name,
    opportunities: enriched
  };
}

/**
 * Retrieves a single opportunity by ID
 */
export function getOpportunityById(id, user = null) {
  const opp = db.getEmploymentOpportunityById(id);
  if (!opp) {
    throw new EmploymentError(`Employment opportunity not found: ${id}`, 404, 'NOT_FOUND');
  }

  return {
    success: true,
    opportunity: enrichOpportunity(opp, user)
  };
}

/**
 * Saves/bookmarks an opportunity for an authenticated citizen
 */
export function saveOpportunity(user, opportunityId) {
  if (!user || !user.id) {
    throw new EmploymentError('Authentication required to save opportunities', 401, 'UNAUTHORIZED');
  }

  const opp = db.getEmploymentOpportunityById(opportunityId);
  if (!opp) {
    throw new EmploymentError(`Employment opportunity not found: ${opportunityId}`, 404, 'NOT_FOUND');
  }

  db.saveUserOpportunity(user.id, opportunityId);

  // Record audit trail
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'OPPORTUNITY_SAVED',
    details: `Citizen saved employment opportunity ${opportunityId} (${opp.title})`
  });

  return {
    success: true,
    message: 'Opportunity saved successfully',
    opportunityId
  };
}

/**
 * Removes a saved opportunity for an authenticated citizen
 */
export function removeSavedOpportunity(user, opportunityId) {
  if (!user || !user.id) {
    throw new EmploymentError('Authentication required to modify saved opportunities', 401, 'UNAUTHORIZED');
  }

  db.removeUserOpportunity(user.id, opportunityId);

  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'OPPORTUNITY_REMOVED',
    details: `Citizen removed saved employment opportunity ${opportunityId}`
  });

  return {
    success: true,
    message: 'Opportunity removed from saved list',
    opportunityId
  };
}

/**
 * Retrieves all saved opportunities for an authenticated citizen
 */
export function getSavedOpportunities(user) {
  if (!user || !user.id) {
    throw new EmploymentError('Authentication required to view saved opportunities', 401, 'UNAUTHORIZED');
  }

  const list = db.getUserSavedOpportunities(user.id);
  const enriched = list.map(opp => enrichOpportunity(opp, user));

  return {
    success: true,
    total: enriched.length,
    opportunities: enriched
  };
}

/**
 * Provides personalized recommendations for an authenticated citizen (suggestions only)
 */
export function getRecommendedOpportunities(user) {
  if (!user || !user.id) {
    throw new EmploymentError('Authentication required to view recommendations', 401, 'UNAUTHORIZED');
  }

  const allActive = db.getEmploymentOpportunities({ status: 'ACTIVE' }).opportunities;

  // Lightweight recommendation scoring based on user profile
  const scored = allActive.map(opp => {
    let score = 0;
    const userState = (user.state || '').toLowerCase();
    const oppLocation = (opp.location || '').toLowerCase();

    if (oppLocation.includes('all india') || (userState && oppLocation.includes(userState))) {
      score += 2;
    }

    if (opp.category === 'Government Jobs' || opp.category === 'Apprenticeships') {
      score += 1;
    }

    return {
      opportunity: enrichOpportunity(opp, user),
      matchScore: score,
      recommendationReason: 'Suggested based on your profile region and active central opportunities'
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return {
    success: true,
    disclaimer: 'Recommendations are informational suggestions and do not guarantee eligibility or selection.',
    recommendations: scored.slice(0, 5)
  };
}

/**
 * Admin: Creates a new employment opportunity
 */
export function createOpportunity(adminUser, data) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new EmploymentError('Only platform administrators can create employment opportunities', 403, 'FORBIDDEN');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new EmploymentError('Opportunity title is required', 400, 'INVALID_TITLE');
  }

  if (!data.organization || typeof data.organization !== 'string') {
    throw new EmploymentError('Organization name is required', 400, 'INVALID_ORGANIZATION');
  }

  if (!data.deadline) {
    throw new EmploymentError('Application deadline date is required', 400, 'INVALID_DEADLINE');
  }

  const opportunity = db.createEmploymentOpportunity(data);

  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'OPPORTUNITY_CREATED',
    details: `Admin created employment opportunity ${opportunity.id} (${opportunity.title})`
  });

  return {
    success: true,
    opportunity
  };
}

/**
 * Admin: Updates an existing opportunity
 */
export function updateOpportunity(adminUser, id, updates) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new EmploymentError('Only platform administrators can update employment opportunities', 403, 'FORBIDDEN');
  }

  const updated = db.updateEmploymentOpportunity(id, updates);
  if (!updated) {
    throw new EmploymentError(`Opportunity not found: ${id}`, 404, 'NOT_FOUND');
  }

  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'OPPORTUNITY_UPDATED',
    details: `Admin updated employment opportunity ${id}`
  });

  return {
    success: true,
    opportunity: updated
  };
}

/**
 * Admin: Deactivates an opportunity
 */
export function deleteOpportunity(adminUser, id) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new EmploymentError('Only platform administrators can deactivate employment opportunities', 403, 'FORBIDDEN');
  }

  const success = db.deleteEmploymentOpportunity(id);
  if (!success) {
    throw new EmploymentError(`Opportunity not found: ${id}`, 404, 'NOT_FOUND');
  }

  db.recordVaultAudit({
    actorId: adminUser.id,
    actorRole: 'ADMIN',
    action: 'OPPORTUNITY_DEACTIVATED',
    details: `Admin deactivated employment opportunity ${id}`
  });

  return {
    success: true,
    message: `Opportunity ${id} deactivated successfully`
  };
}
