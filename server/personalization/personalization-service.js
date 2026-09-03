/**
 * SIH Government Service Integration Platform — Personalization Engine
 * Transparent, rule-based recommendation and action-aware citizen dashboard.
 *
 * Core Principle: "One citizen → one personalized government information dashboard."
 *
 * Safety Rule:
 * Recommendations are informational suggestions and must NEVER claim official eligibility or approval.
 */

import { db } from '../db.js';

export class PersonalizationError extends Error {
  constructor(message, statusCode = 400, code = 'PERSONALIZATION_ERROR') {
    super(message);
    this.name = 'PersonalizationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const SAFETY_DISCLAIMER = 'Informational suggestion based on portal preferences. This does NOT guarantee official eligibility or approval. Official eligibility is determined solely by the respective government authority.';

/**
 * Calculates a transparent matching score and explainable reasons for an item against citizen preferences
 */
function scoreItem(item, type, prefs) {
  let score = 0;
  const reasons = [];

  const persona = prefs.persona || 'GENERAL';
  const prefLocation = (prefs.preferredLocation || '').toLowerCase().trim();
  const prefQual = (prefs.qualification || '').toLowerCase().trim();
  const prefEdu = (prefs.educationLevel || '').toLowerCase().trim();
  const userSkills = new Set((prefs.skills || []).map(s => s.toLowerCase().trim()));

  // 1. Persona Alignment (+35 pts)
  if (persona === 'STUDENT') {
    if (type === 'scholarship') {
      score += 35;
      reasons.push('Matches your Student profile (Education & Scholarships focus)');
    } else if (item.category && item.category.toLowerCase().includes('education')) {
      score += 30;
      reasons.push('Relevant to your Student profile');
    }
  } else if (persona === 'JOB_SEEKER') {
    if (type === 'employment') {
      score += 35;
      reasons.push('Matches your Job Seeker profile (Employment & Career focus)');
    } else if (item.category && (item.category.toLowerCase().includes('skill') || item.category.toLowerCase().includes('employment'))) {
      score += 30;
      reasons.push('Relevant to job seeking and skill development');
    }
  } else if (persona === 'FARMER') {
    if (item.category && item.category.toLowerCase().includes('agriculture')) {
      score += 35;
      reasons.push('Matches your Farmer profile (Agriculture & Rural focus)');
    }
  } else if (persona === 'BUSINESS') {
    if (item.category && (item.category.toLowerCase().includes('financial') || item.category.toLowerCase().includes('inclusion') || item.category.toLowerCase().includes('vendor'))) {
      score += 35;
      reasons.push('Matches your Business & Entrepreneur profile');
    }
  }

  // 2. Category / Interest Alignment (+25 pts)
  const allInterests = [
    ...(prefs.serviceInterests || []),
    ...(prefs.schemeCategories || []),
    ...(prefs.employmentInterests || [])
  ].map(i => i.toLowerCase().trim());

  if (item.category && allInterests.some(i => item.category.toLowerCase().includes(i))) {
    score += 25;
    reasons.push(`Relevant to your selected interest in ${item.category}`);
  }

  // 3. Location Match (+20 pts)
  if (item.location) {
    const loc = item.location.toLowerCase();
    if (prefLocation && loc.includes(prefLocation)) {
      score += 20;
      reasons.push(`Available in your state / region (${prefs.preferredLocation})`);
    } else if (loc.includes('all india')) {
      score += 10;
      reasons.push('Open for applicants across All India');
    }
  }

  // 4. Qualification / Education Match (+20 pts)
  const itemQual = (item.qualification || item.eligibility || '').toLowerCase();
  if (prefQual && itemQual.includes(prefQual)) {
    score += 20;
    reasons.push(`Matches your recorded qualification (${prefs.qualification})`);
  } else if (prefEdu && itemQual.includes(prefEdu)) {
    score += 15;
    reasons.push(`Matches your education level (${prefs.educationLevel})`);
  }

  // 5. Skill Match (+15 pts)
  if (Array.isArray(item.skills) && userSkills.size > 0) {
    const matchedSkills = item.skills.filter(sk => {
      const skl = sk.toLowerCase().trim();
      return userSkills.has(skl) || [...userSkills].some(us => skl.includes(us) || us.includes(skl));
    });
    if (matchedSkills.length > 0) {
      score += 15 * Math.min(matchedSkills.length, 3);
      reasons.push(`Matches your skill${matchedSkills.length > 1 ? 's' : ''}: ${matchedSkills.join(', ')}`);
    }
  }

  // 6. Approaching Deadline Bonus (+10 pts)
  if (item.deadline) {
    const now = Date.now();
    const d = new Date(item.deadline).getTime();
    if (d > now && (d - now) <= 7 * 24 * 60 * 60 * 1000) {
      score += 10;
      reasons.push(`Approaching application cutoff (${item.deadline})`);
    }
  }

  // Default fallback reason if score is low
  if (reasons.length === 0) {
    reasons.push('Popular verified public service program');
  }

  return {
    score,
    reasons,
    disclaimer: SAFETY_DISCLAIMER
  };
}

// -----------------------------------------------------------------
// PREFERENCES CONTROLS
// -----------------------------------------------------------------

export function getPersonalizationPreferences(user) {
  if (!user || !user.id) {
    throw new PersonalizationError('Authentication required to view preferences', 401, 'UNAUTHORIZED');
  }
  const prefs = db.getCitizenPreferences(user.id);
  return {
    success: true,
    preferences: prefs
  };
}
export const getPreferences = getPersonalizationPreferences;

export function updatePersonalizationPreferences(user, updates) {
  if (!user || !user.id) {
    throw new PersonalizationError('Authentication required to update preferences', 401, 'UNAUTHORIZED');
  }
  const updated = db.updateCitizenPreferences(user.id, updates);
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'PREFERENCES_UPDATED',
    details: `Citizen updated personalization preferences (persona: ${updated.persona})`
  });
  return {
    success: true,
    message: 'Personalization preferences updated successfully',
    preferences: updated
  };
}
export const updatePreferences = updatePersonalizationPreferences;

export function resetPersonalizationPreferences(user) {
  if (!user || !user.id) {
    throw new PersonalizationError('Authentication required to reset preferences', 401, 'UNAUTHORIZED');
  }
  const reset = db.resetCitizenPreferences(user.id);
  db.recordVaultAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'PREFERENCES_RESET',
    details: 'Citizen reset personalization preferences to system defaults'
  });
  return {
    success: true,
    message: 'Personalization preferences reset to defaults',
    preferences: reset
  };
}
export const resetPreferences = resetPersonalizationPreferences;

export function dismissRecommendation(user, recId) {
  if (!user || !user.id) {
    throw new PersonalizationError('Authentication required to dismiss recommendation', 401, 'UNAUTHORIZED');
  }
  db.dismissRecommendation(user.id, recId);
  return {
    success: true,
    message: `Recommendation ${recId} dismissed`,
    recommendationId: recId
  };
}

export function restoreRecommendation(user, recId) {
  if (!user || !user.id) {
    throw new PersonalizationError('Authentication required to restore recommendation', 401, 'UNAUTHORIZED');
  }
  db.restoreRecommendation(user.id, recId);
  return {
    success: true,
    message: `Recommendation ${recId} restored`,
    recommendationId: recId
  };
}

// -----------------------------------------------------------------
// RECOMMENDATION ENGINES
// -----------------------------------------------------------------

export function getRecommendedServices(user, options = {}) {
  const prefs = db.getCitizenPreferences(user.id);
  if (!prefs.enabled) {
    return {
      success: true,
      enabled: false,
      message: 'Personalization is currently disabled in your preferences',
      services: []
    };
  }

  const dismissed = db.getDismissedRecommendations(user.id);
  const allServices = db.SERVICES || [];

  const scored = allServices
    .filter(s => !dismissed.has(s.id))
    .map(s => {
      const match = scoreItem(s, 'service', prefs);
      return {
        ...s,
        relevanceScore: match.score,
        recommendationReasons: match.reasons,
        disclaimer: match.disclaimer
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const limit = parseInt(options.limit || '6', 10);
  return {
    success: true,
    enabled: true,
    total: scored.length,
    services: scored.slice(0, limit)
  };
}

export function getRecommendedScholarships(user, options = {}) {
  const prefs = db.getCitizenPreferences(user.id);
  if (!prefs.enabled) {
    return {
      success: true,
      enabled: false,
      message: 'Personalization is currently disabled in your preferences',
      scholarships: []
    };
  }

  const dismissed = db.getDismissedRecommendations(user.id);
  const res = db.getScholarships({ limit: 50 });
  const allScholarships = res.scholarships || [];

  const scored = allScholarships
    .filter(s => !dismissed.has(s.id))
    .map(s => {
      const match = scoreItem(s, 'scholarship', prefs);
      return {
        ...s,
        relevanceScore: match.score,
        recommendationReasons: match.reasons,
        disclaimer: match.disclaimer
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const limit = parseInt(options.limit || '6', 10);
  return {
    success: true,
    enabled: true,
    total: scored.length,
    scholarships: scored.slice(0, limit)
  };
}

export function getRecommendedSchemes(user, options = {}) {
  const prefs = db.getCitizenPreferences(user.id);
  if (!prefs.enabled) {
    return {
      success: true,
      enabled: false,
      message: 'Personalization is currently disabled in your preferences',
      schemes: []
    };
  }

  const dismissed = db.getDismissedRecommendations(user.id);
  const res = db.getSchemes({ limit: 50 });
  const allSchemes = res.schemes || [];

  const scored = allSchemes
    .filter(s => !dismissed.has(s.id))
    .map(s => {
      const match = scoreItem(s, 'scheme', prefs);
      return {
        ...s,
        relevanceScore: match.score,
        recommendationReasons: match.reasons,
        disclaimer: match.disclaimer
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const limit = parseInt(options.limit || '6', 10);
  return {
    success: true,
    enabled: true,
    total: scored.length,
    schemes: scored.slice(0, limit)
  };
}

export function getRecommendedEmployment(user, options = {}) {
  const prefs = db.getCitizenPreferences(user.id);
  if (!prefs.enabled) {
    return {
      success: true,
      enabled: false,
      message: 'Personalization is currently disabled in your preferences',
      employment: []
    };
  }

  const dismissed = db.getDismissedRecommendations(user.id);
  const res = db.getEmploymentOpportunities({ limit: 50 });
  const allOpps = res.opportunities || [];

  const scored = allOpps
    .filter(o => !dismissed.has(o.id))
    .map(o => {
      const match = scoreItem(o, 'employment', prefs);
      return {
        ...o,
        relevanceScore: match.score,
        recommendationReasons: match.reasons,
        disclaimer: match.disclaimer
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const limit = parseInt(options.limit || '6', 10);
  return {
    success: true,
    enabled: true,
    total: scored.length,
    employment: scored.slice(0, limit)
  };
}

export function getRecommendedAnnouncements(user, options = {}) {
  const prefs = db.getCitizenPreferences(user.id);
  if (!prefs.enabled) {
    return {
      success: true,
      enabled: false,
      message: 'Personalization is currently disabled in your preferences',
      announcements: []
    };
  }

  const dismissed = db.getDismissedRecommendations(user.id);
  const res = db.getAnnouncements({ limit: 50 });
  const allAnn = res.announcements || [];

  const scored = allAnn
    .filter(a => !dismissed.has(a.id))
    .map(a => {
      const match = scoreItem(a, 'announcement', prefs);
      return {
        ...a,
        relevanceScore: match.score,
        recommendationReasons: match.reasons,
        disclaimer: match.disclaimer
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const limit = parseInt(options.limit || '6', 10);
  return {
    success: true,
    enabled: true,
    total: scored.length,
    announcements: scored.slice(0, limit)
  };
}

// -----------------------------------------------------------------
// COMBINED PERSONALIZED DASHBOARD & ACTION CARDS
// -----------------------------------------------------------------

export function getPersonalizedDashboard(user) {
  if (!user || !user.id) {
    throw new PersonalizationError('Authentication required for personalized dashboard', 401, 'UNAUTHORIZED');
  }

  const prefs = db.getCitizenPreferences(user.id);

  // 1. Application-Aware Action Cards
  const actionCards = [];
  const userApps = db.getUserApplications ? db.getUserApplications(user.id) : [];

  for (const app of userApps) {
    if (app.status === 'CLARIFICATION_REQUIRED') {
      actionCards.push({
        id: `ACT-CLARIFY-${app.id}`,
        type: 'ACTION_REQUIRED',
        priority: 'HIGH',
        title: 'Application Clarification Requested',
        message: `Department officer requested clarification on application #${app.id} (${app.serviceTitle || 'Government Service'}).`,
        actionLabel: 'Respond to Clarification',
        targetTab: 'tracking',
        targetId: app.id
      });
    } else if (app.status === 'DRAFT') {
      actionCards.push({
        id: `ACT-DRAFT-${app.id}`,
        type: 'INCOMPLETE_DRAFT',
        priority: 'MEDIUM',
        title: 'Incomplete Application Draft',
        message: `You have an unsaved or pending draft for ${app.serviceTitle || 'Service'}.`,
        actionLabel: 'Resume Draft',
        targetTab: 'workflow',
        targetId: app.id
      });
    }
  }

  // 2. Vault-Aware Action Cards
  const userDocs = db.getUserVaultDocuments ? db.getUserVaultDocuments(user.id) : [];
  const hasIncomeProof = userDocs.some(d => d.documentType === 'INCOME_CERTIFICATE');
  if (!hasIncomeProof && (prefs.persona === 'STUDENT' || prefs.persona === 'FARMER')) {
    actionCards.push({
      id: 'ACT-VAULT-INCOME',
      type: 'VAULT_RECOMMENDATION',
      priority: 'LOW',
      title: 'Upload Income Certificate to Vault',
      message: 'Having a verified Income Certificate in your vault enables 1-click document reuse for scholarships and welfare schemes.',
      actionLabel: 'Open Document Vault',
      targetTab: 'vault'
    });
  }

  // 3. Category Recommendations
  const services = getRecommendedServices(user, { limit: 3 });
  const scholarships = getRecommendedScholarships(user, { limit: 3 });
  const schemes = getRecommendedSchemes(user, { limit: 3 });
  const employment = getRecommendedEmployment(user, { limit: 3 });
  const announcements = getRecommendedAnnouncements(user, { limit: 3 });

  return {
    success: true,
    citizen: {
      id: user.id,
      name: user.name,
      state: user.state
    },
    preferences: prefs,
    actionCards,
    recommendations: {
      services: services.services || [],
      scholarships: scholarships.scholarships || [],
      schemes: schemes.schemes || [],
      employment: employment.employment || [],
      announcements: announcements.announcements || []
    },
    disclaimer: SAFETY_DISCLAIMER
  };
}

// -----------------------------------------------------------------
// ADMIN AGGREGATED METRICS
// -----------------------------------------------------------------

export function getPersonalizationMetrics(adminUser) {
  if (!adminUser || adminUser.role !== 'ADMIN') {
    throw new PersonalizationError('Only administrators can view personalization metrics', 403, 'FORBIDDEN');
  }

  let totalPreferences = 0;
  let enabledCount = 0;
  const personaDistribution = {};

  for (const [userId, prefs] of db.citizenPreferences.entries()) {
    totalPreferences++;
    if (prefs.enabled) enabledCount++;
    const p = prefs.persona || 'GENERAL';
    personaDistribution[p] = (personaDistribution[p] || 0) + 1;
  }

  let totalDismissals = 0;
  for (const set of db.dismissedRecommendations.values()) {
    totalDismissals += set.size;
  }

  return {
    success: true,
    metrics: {
      totalCitizenProfiles: totalPreferences,
      personalizationEnabledRate: totalPreferences > 0 ? `${((enabledCount / totalPreferences) * 100).toFixed(1)}%` : '100%',
      personaDistribution,
      totalDismissedRecommendations: totalDismissals
    }
  };
}
