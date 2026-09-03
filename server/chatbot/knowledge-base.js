/**
 * SIH Government Service Integration Platform — Grounded Knowledge Base Layer
 * Supplies verified information from Service Catalog, Document Types, and Citizen Applications.
 * Strictly prevents hallucination of government policies, deadlines, or official decisions.
 */

import { db, SERVICES } from '../db.js';

const STATUS_EXPLANATIONS = {
  DRAFT: 'Your application is saved as an in-progress draft. You can continue editing and submitting documents anytime before final submission.',
  SUBMITTED: 'Your application has been received by the platform and queued for nodal department assignment.',
  RECEIVED: 'The nodal department has received your file and placed it in the review queue.',
  UNDER_REVIEW: 'An authorized department officer has claimed your application and is actively verifying submitted information and certificates.',
  VERIFICATION_REQUIRED: 'Automated inter-department cross-verification is in progress (e.g. DigiLocker e-KYC or Revenue cross-check).',
  CLARIFICATION_REQUIRED: 'The reviewing officer has requested additional clarification or supplementary proof. Please open Application Tracking to submit your response.',
  PROCESSING: 'Inter-department data exchange and eligibility calculations are being finalized.',
  APPROVED: 'Your application has satisfied all statutory criteria and has been approved by the competent authority.',
  REJECTED: 'Your application was rejected by the reviewing authority based on documented statutory grounds.',
  COMPLETED: 'Service fulfillment is complete. Your official digital certificate or sanction order is ready for download.'
};

const GENERAL_FAQS = [
  {
    keywords: ['how to apply', 'application procedure', 'apply online', 'steps to apply'],
    topic: 'Application Procedure',
    answer: 'To apply for any government service:\n1. Browse the Government Services catalog and select your desired service.\n2. Click "Start Application" to begin the unified application workflow.\n3. Fill in your personal details or pull verified documents from your Digital Document Vault.\n4. Review and submit. You will receive an Application ID (e.g. APP-2026-...) to track progress.',
    source: 'Unified Citizen Portal Guidelines'
  },
  {
    keywords: ['digital document vault', 'vault', 'store documents', 'reuse documents', 'upload documents'],
    topic: 'Digital Document Vault',
    answer: 'The Digital Document Vault lets you securely store and organize government certificates (Aadhaar, Income Certificates, Marksheets). Once stored, you can reuse them across multiple applications without uploading them again.',
    source: 'Document Vault Help Guide'
  },
  {
    keywords: ['tracking', 'track application', 'status of application', 'where is my application'],
    topic: 'Application Tracking',
    answer: 'You can track all your submitted applications under "Application Tracking & Status". It displays real-time stages, officer review progress, timeline events, and any pending clarification requests.',
    source: 'Citizen Application Tracking Guide'
  }
];

export class KnowledgeBase {
  /**
   * Searches catalog and user data for relevant government knowledge
   */
  searchKnowledge(query, { user, citizenApplications = [] } = {}) {
    const q = (query || '').toLowerCase().trim();
    const results = {
      matchedService: null,
      matchedApplication: null,
      matchedStatus: null,
      matchedFaq: null,
      sources: []
    };

    // 1. Check for specific Application ID in query (e.g. APP-2026-EDU-8812)
    const appIdMatch = query.match(/APP-\d{4}-[A-Z0-9]+-[A-Z0-9]+/i) || query.match(/APP-\d{4}-[A-Z0-9]+/i);
    if (appIdMatch) {
      const requestedId = appIdMatch[0].toUpperCase();
      const app = citizenApplications.find(a => a.id === requestedId);
      if (app) {
        results.matchedApplication = app;
        results.sources.push(`Application Record: ${app.id}`);
      } else {
        // App ID mentioned but not owned by this citizen
        results.unauthorizedAppId = requestedId;
      }
    } else if ((q.includes('my application') || q.includes('status of my') || q.includes('application status')) && citizenApplications.length > 0) {
      // Return the most recent application
      results.matchedApplication = citizenApplications[0];
      results.sources.push(`Recent Application: ${citizenApplications[0].id}`);
    }

    // 2. Check Service Catalog
    const queryTokens = new Set(q.split(/\W+/).filter(Boolean));
    const STOP_WORDS = new Set(['for', 'and', 'with', 'from', 'the', 'issuance']);

    for (const srv of SERVICES) {
      const title = srv.title.toLowerCase();
      const category = srv.category.toLowerCase();
      const keywords = (srv.keywords || []).map(k => k.toLowerCase());

      const matchesTitle = title.split(/\W+/).some(w => w.length > 3 && !STOP_WORDS.has(w) && queryTokens.has(w));
      const matchesKeyword = keywords.some(k => {
        if (k.length <= 3) {
          return queryTokens.has(k);
        }
        return q.includes(k);
      });
      const matchesCategory = category.length > 3 && q.includes(category);

      if (matchesTitle || matchesKeyword || matchesCategory) {
        results.matchedService = srv;
        results.sources.push(`Government Service Catalog: ${srv.title} (${srv.officialUrl || 'Official Portal'})`);
        break;
      }
    }

    // 3. Check Status Definitions
    for (const [statusKey, explanation] of Object.entries(STATUS_EXPLANATIONS)) {
      if (q.includes(statusKey.toLowerCase().replace(/_/g, ' ')) || q.includes(statusKey.toLowerCase())) {
        results.matchedStatus = { code: statusKey, explanation };
        results.sources.push('Portal Statutory Lifecycle Guide');
        break;
      }
    }

    // 4. Check FAQs
    for (const faq of GENERAL_FAQS) {
      if (faq.keywords.some(k => q.includes(k))) {
        results.matchedFaq = faq;
        results.sources.push(faq.source);
        break;
      }
    }

    // 5. Check Employment Opportunities & Schemes
    const isEmploymentQuery = ['job', 'jobs', 'employment', 'apprenticeship', 'apprenticeships', 'recruitment', 'vacancy', 'vacancies', 'skill', 'training'].some(w => queryTokens.has(w) || q.includes(w));
    if (isEmploymentQuery && db.getEmploymentOpportunities) {
      const empRes = db.getEmploymentOpportunities({ search: q, limit: 3 });
      const activeOpps = empRes.opportunities.length > 0 ? empRes.opportunities : db.getEmploymentOpportunities({ limit: 1 }).opportunities;
      if (activeOpps.length > 0) {
        results.matchedEmployment = activeOpps[0];
        results.sources.push(`National Career Service (NCS) / Employment Hub: ${activeOpps[0].title}`);
      }
    }

    // 6. Check Scholarships
    const isScholarshipQuery = ['scholarship', 'scholarships', 'nmmss', 'pragati', 'merit scholarship'].some(w => queryTokens.has(w) || q.includes(w));
    if (isScholarshipQuery && db.getScholarships) {
      const schRes = db.getScholarships({ search: q, limit: 1 });
      const sch = schRes.scholarships.length > 0 ? schRes.scholarships[0] : db.getScholarships({ limit: 1 }).scholarships[0];
      if (sch) {
        results.matchedScholarship = sch;
        results.sources.push(`National Scholarship Portal (NSP): ${sch.title}`);
      }
    }

    // 7. Check Government Schemes
    const isSchemeQuery = ['scheme', 'schemes', 'svanidhi', 'pmfby', 'fasal bima', 'welfare scheme'].some(w => queryTokens.has(w) || q.includes(w));
    if (isSchemeQuery && db.getSchemes) {
      const scRes = db.getSchemes({ search: q, limit: 1 });
      const sc = scRes.schemes.length > 0 ? scRes.schemes[0] : db.getSchemes({ limit: 1 }).schemes[0];
      if (sc) {
        results.matchedScheme = sc;
        results.sources.push(`myScheme Portal: ${sc.title}`);
      }
    }

    // 8. Check Announcements / News
    const isNewsQuery = ['news', 'announcement', 'announcements', 'circular', 'press release'].some(w => queryTokens.has(w) || q.includes(w));
    if (isNewsQuery && db.getAnnouncements) {
      const newsRes = db.getAnnouncements({ search: q, limit: 1 });
      const news = newsRes.announcements.length > 0 ? newsRes.announcements[0] : db.getAnnouncements({ limit: 1 }).announcements[0];
      if (news) {
        results.matchedAnnouncement = news;
        results.sources.push(`Press Information Bureau (PIB): ${news.title}`);
      }
    }

    return results;
  }

  /**
   * Generates a grounded, verified assistant response based strictly on trusted portal knowledge
   */
  generateGroundedResponse(query, knowledge, user) {
    const actions = [];
    let responseText = '';

    // Case 1: Unauthorized query for an application belonging to someone else
    if (knowledge.unauthorizedAppId) {
      return {
        text: `Access Denied: You are not authorized to view details for application ${knowledge.unauthorizedAppId}. In accordance with government privacy standards, you can only track applications submitted under your own authenticated account.`,
        sources: ['Government Data Privacy & RBAC Policy'],
        actions: [
          { type: 'NAVIGATE', target: 'tracking', label: 'View My Applications' }
        ]
      };
    }

    // Case 2: Citizen's own application inquiry
    if (knowledge.matchedApplication) {
      const app = knowledge.matchedApplication;
      const stageDesc = app.currentStage || app.status;
      const statusText = STATUS_EXPLANATIONS[app.status] || app.status;

      responseText = `**Application Status: ${app.id}**\n\n` +
        `• **Service:** ${app.serviceName}\n` +
        `• **Current Stage:** ${stageDesc}\n` +
        `• **Status:** ${app.status}\n\n` +
        `${statusText}\n\n` +
        `*Last updated: ${app.updatedAt ? app.updatedAt.slice(0, 10) : 'Recent'}*`;

      if (app.status === 'CLARIFICATION_REQUIRED') {
        responseText += `\n\n⚠️ **Action Required:** The department officer has requested clarification. Please open Application Tracking to provide the requested details.`;
      }

      actions.push({
        type: 'TRACK_APPLICATION',
        applicationId: app.id,
        label: `Track ${app.id}`
      });

      return {
        text: responseText,
        sources: knowledge.sources,
        actions
      };
    }

    // Case 3: Matched Government Service Inquiry
    if (knowledge.matchedService) {
      const srv = knowledge.matchedService;
      responseText = `**${srv.title}**\n\n` +
        `• **Department:** ${srv.department}\n` +
        `• **Category:** ${srv.category}\n` +
        `• **Eligibility:** ${srv.eligibility}\n` +
        `• **Turnaround Time:** ${srv.turnaroundTime}\n` +
        `• **Processing Fee:** ${srv.fee || 'Free'}\n\n` +
        `**Required Documents:**\n` +
        (srv.requiredDocuments || []).map(d => `  - ${d}`).join('\n') +
        `\n\n*Official Portal Source: ${srv.officialUrl}*`;

      actions.push({
        type: 'VIEW_SERVICE',
        serviceId: srv.id,
        label: `View ${srv.title}`
      });

      actions.push({
        type: 'START_APPLICATION',
        serviceId: srv.id,
        label: 'Start Application'
      });

      return {
        text: responseText,
        sources: knowledge.sources,
        actions
      };
    }

    // Case 4: Status meaning inquiry
    if (knowledge.matchedStatus) {
      const { code, explanation } = knowledge.matchedStatus;
      return {
        text: `**Status Meaning: ${code}**\n\n${explanation}`,
        sources: knowledge.sources,
        actions: [
          { type: 'NAVIGATE', target: 'tracking', label: 'Check My Applications' }
        ]
      };
    }

    // Case 5: Matched FAQ
    if (knowledge.matchedFaq) {
      return {
        text: `**${knowledge.matchedFaq.topic}**\n\n${knowledge.matchedFaq.answer}`,
        sources: knowledge.sources,
        actions: [
          { type: 'NAVIGATE', target: 'services', label: 'Explore Service Catalog' }
        ]
      };
    }

    // Case 6: Matched Employment Opportunity
    if (knowledge.matchedEmployment) {
      const emp = knowledge.matchedEmployment;
      responseText = `**${emp.title}**\n\n` +
        `• **Organization:** ${emp.organization}\n` +
        `• **Category:** ${emp.category}\n` +
        `• **Eligibility:** ${emp.eligibility}\n` +
        `• **Vacancies:** ${emp.vacancies} Positions\n` +
        `• **Application Deadline:** ${emp.deadline}\n` +
        `• **Salary / Stipend:** ${emp.salary || 'As per rules'}\n\n` +
        `*Official Source: ${emp.source} (${emp.applicationUrl})*\n\n` +
        `*(MOCK / DEMO DATA — NOT A LIVE GOVERNMENT INTEGRATION)*`;

      actions.push({
        type: 'NAVIGATE',
        target: 'employment',
        label: 'Open Employment Hub'
      });

      return {
        text: responseText,
        sources: knowledge.sources,
        actions
      };
    }

    // Case 7: Matched Scholarship
    if (knowledge.matchedScholarship) {
      const sch = knowledge.matchedScholarship;
      responseText = `**${sch.title}**\n\n` +
        `• **Ministry / Provider:** ${sch.provider}\n` +
        `• **Benefit Amount:** ${sch.benefitAmount || sch.benefit}\n` +
        `• **Eligibility:** ${sch.eligibility}\n` +
        `• **Application Deadline:** ${sch.deadline}\n\n` +
        `**Required Documents:**\n` +
        (sch.requiredDocuments || []).map(d => `  - ${d}`).join('\n') +
        `\n\n*Official Source: ${sch.source} (${sch.applicationUrl})*`;

      if (sch.relatedServiceId) {
        actions.push({
          type: 'VIEW_SERVICE',
          serviceId: sch.relatedServiceId,
          label: 'Apply through Unified Portal'
        });
      }
      actions.push({
        type: 'NAVIGATE',
        target: 'scholarships',
        label: 'View Scholarships Hub'
      });

      return {
        text: responseText,
        sources: knowledge.sources,
        actions
      };
    }

    // Case 8: Matched Government Scheme
    if (knowledge.matchedScheme) {
      const sc = knowledge.matchedScheme;
      responseText = `**${sc.title}**\n\n` +
        `• **Department:** ${sc.department}\n` +
        `• **Category:** ${sc.category}\n` +
        `• **Benefits:** ${sc.benefits}\n` +
        `• **Eligibility:** ${sc.eligibility}\n` +
        `• **Application Process:** ${sc.applicationProcess}\n\n` +
        `*Official Portal Source: ${sc.source} (${sc.applicationUrl})*`;

      if (sc.relatedServiceId) {
        actions.push({
          type: 'VIEW_SERVICE',
          serviceId: sc.relatedServiceId,
          label: 'Apply via Service Catalog'
        });
      }
      actions.push({
        type: 'NAVIGATE',
        target: 'schemes',
        label: 'View Schemes Directory'
      });

      return {
        text: responseText,
        sources: knowledge.sources,
        actions
      };
    }

    // Case 9: Matched News / Announcement
    if (knowledge.matchedAnnouncement) {
      const ann = knowledge.matchedAnnouncement;
      responseText = `**${ann.title}**\n\n` +
        `• **Department:** ${ann.department}\n` +
        `• **Published Date:** ${ann.publishedAt}\n` +
        `• **Category:** ${ann.category}\n\n` +
        `${ann.summary}\n\n` +
        `*Official Reference: ${ann.officialReference || ann.source}*`;

      actions.push({
        type: 'NAVIGATE',
        target: 'news',
        label: 'Read Official Announcements'
      });

      return {
        text: responseText,
        sources: knowledge.sources,
        actions
      };
    }

    // Case 10: Fallback for uncataloged / unverified topics
    return {
      text: "I don't have verified information for that specific query in the official portal knowledge base.\n\nPlease explore our **Government Services Catalog** for cataloged services, or check the official national portals at **myScheme.gov.in** and **scholarships.gov.in**.",
      sources: ['National Citizen Services Directory'],
      actions: [
        { type: 'NAVIGATE', target: 'services', label: 'Browse Service Catalog' },
        { type: 'NAVIGATE', target: 'schemes', label: 'View Government Schemes' }
      ]
    };
  }
}

export const knowledgeBase = new KnowledgeBase();
