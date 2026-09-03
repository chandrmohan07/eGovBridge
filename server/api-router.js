/**
 * SIH Government Service Integration Platform — Authentication & RBAC API Router
 * Handles incoming HTTP REST requests for Auth and Protected Role Routes.
 */

import { register, login, logout, authenticateToken, requireRole, requireDepartmentScope, AuthError } from './auth.js';
import { db } from './db.js';
import { validateApplicationPayload, validateDocument } from './validation.js';
import { stepOrchestration, executeTask, updateTaskDependencies, computeOrchestrationStatus, TASK_STATUS, ORCHESTRATION_STATUS } from './orchestrator.js';
import { adapterRegistry } from './adapters/adapter-registry.js';
import {
  SCHEMAS,
  CANONICAL_VERSION,
  validateCitizen,
  validateAddress,
  validateApplication,
  normalizeDepartmentPayload,
  transformCanonicalToDepartment
} from './standardization/index.js';
import {
  dataExchangeService,
  EXCHANGE_POLICIES,
  EXCHANGE_STATUS
} from './exchange/index.js';
import {
  getOfficerQueue,
  getOfficerApplicationDetail,
  claimApplication,
  startReview,
  requestClarification,
  addOfficerNote,
  approveApplication,
  rejectApplication,
  completeApplication,
  getDepartmentWorkload,
  OfficerWorkflowError
} from './officer/officer-workflow.js';
import {
  getApplicationTracking,
  respondToClarification,
  getCitizenApplications,
  TrackingError
} from './tracking/index.js';
import {
  getDocumentTypes,
  uploadDocument,
  listCitizenDocuments,
  getDocumentMetadata,
  downloadDocument,
  deleteDocument,
  associateDocumentWithApplication,
  getVaultAuditLogs,
  VaultError
} from './vault/index.js';
import {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getPreferences,
  updatePreferences,
  getNotificationTypes,
  safeNotifyApplicationSubmitted,
  NotificationError
} from './notifications/index.js';
import {
  createChatSession,
  getChatSession,
  sendMessage,
  clearChatSession,
  getSuggestedPrompts,
  ChatbotError
} from './chatbot/index.js';
import {
  listOpportunities,
  getOpportunityById,
  saveOpportunity,
  removeSavedOpportunity,
  getSavedOpportunities,
  getRecommendedOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  EmploymentError
} from './employment/index.js';
import {
  listScholarships,
  getScholarshipById,
  saveScholarship,
  removeSavedScholarship,
  getSavedScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  listSchemes,
  getSchemeById,
  saveScheme,
  removeSavedScheme,
  getSavedSchemes,
  createScheme,
  updateScheme,
  deleteScheme,
  listAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  ContentHubError
} from './content-hub/index.js';
import {
  getPersonalizationPreferences,
  updatePersonalizationPreferences,
  resetPersonalizationPreferences,
  dismissRecommendation,
  restoreRecommendation,
  getRecommendedServices,
  getRecommendedScholarships,
  getRecommendedSchemes,
  getRecommendedEmployment,
  getRecommendedAnnouncements,
  getPersonalizedDashboard,
  getPersonalizationMetrics,
  PersonalizationError
} from './personalization/index.js';
import {
  createGrievance,
  getGrievanceById,
  listGrievances,
  claimGrievance,
  addGrievanceInternalNote,
  requestGrievanceClarification,
  respondToGrievanceClarification,
  resolveGrievance,
  rejectGrievance,
  closeGrievance,
  getGrievanceTimeline,
  submitFeedback,
  listFeedback,
  getGrievanceAnalytics,
  GRIEVANCE_CATEGORIES,
  GrievanceError
} from './grievances/index.js';
import {
  getAdminOverview,
  getApplicationAnalytics,
  getDepartmentAnalytics,
  getOfficerAnalytics,
  getServicePerformance,
  getWorkflowAnalytics,
  getExchangeAnalytics,
  getPlatformHealth,
  exportAdminReport,
  AdminError
} from './admin/index.js';
import {
  getAuditEvents,
  recordAuditEvent,
  AUDIT_EVENTS
} from './security/index.js';

function readJsonBody(req, maxLimit = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > maxLimit) { // 10MB limit for base64 documents
        req.destroy();
        reject(new AuthError('Payload too large', 413));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new AuthError('Malformed JSON in request body', 400));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const reqId = res.getHeader('X-Request-Id');
  if (reqId && typeof data === 'object' && data !== null && !data.requestId) {
    data.requestId = reqId;
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  try {
    // 1. POST /api/v1/auth/register
    if (method === 'POST' && pathname === '/api/v1/auth/register') {
      const body = await readJsonBody(req);
      const result = register(body);
      return sendJson(res, 201, { success: true, ...result });
    }

    // 2. POST /api/v1/auth/login
    if (method === 'POST' && pathname === '/api/v1/auth/login') {
      const body = await readJsonBody(req);
      const result = login(body);
      return sendJson(res, 200, { success: true, ...result });
    }

    // 3. POST /api/v1/auth/logout
    if (method === 'POST' && pathname === '/api/v1/auth/logout') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      logout(token);
      return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    }

    // 4. GET /api/v1/auth/me (Protected: Any authenticated user)
    if (method === 'GET' && pathname === '/api/v1/auth/me') {
      const { user } = authenticateToken(req.headers.authorization);
      return sendJson(res, 200, { success: true, user });
    }

    // 5. GET /api/v1/officer/workspace (Protected: Officer only)
    if (method === 'GET' && pathname === '/api/v1/officer/workspace') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['OFFICER']);

      const applications = db.getDepartmentalApplications(user.departmentCode);
      return sendJson(res, 200, {
        success: true,
        officer: user,
        departmentCode: user.departmentCode,
        applicationsCount: applications.length,
        applications
      });
    }

    // 6. GET /api/v1/officer/department/:deptCode/applications (Protected: Officer with specific department scope)
    const deptMatch = pathname.match(/^\/api\/v1\/officer\/department\/([^/]+)\/applications$/);
    if (method === 'GET' && deptMatch) {
      const targetDept = deptMatch[1].toUpperCase();
      const { user } = authenticateToken(req.headers.authorization);
      
      // Enforce strict department boundary
      requireDepartmentScope(user, targetDept);

      const applications = db.getDepartmentalApplications(targetDept);
      return sendJson(res, 200, {
        success: true,
        departmentCode: targetDept,
        applications
      });
    }

    // 6a. GET /api/v1/officer/applications (Officer Queue)
    if (method === 'GET' && pathname === '/api/v1/officer/applications') {
      const { user } = authenticateToken(req.headers.authorization);
      const urlObj = new URL(req.url, 'http://localhost');
      const filters = {
        status: urlObj.searchParams.get('status') || 'ALL',
        search: urlObj.searchParams.get('search') || '',
        assignedToMe: urlObj.searchParams.get('assignedToMe'),
        unassigned: urlObj.searchParams.get('unassigned')
      };

      const queue = getOfficerQueue(user, filters);
      return sendJson(res, 200, {
        success: true,
        departmentCode: user.departmentCode,
        count: queue.length,
        applications: queue
      });
    }

    // 6b. GET /api/v1/officer/workload (Department Workload Statistics)
    if (method === 'GET' && pathname === '/api/v1/officer/workload') {
      const { user } = authenticateToken(req.headers.authorization);
      const workload = getDepartmentWorkload(user);
      return sendJson(res, 200, {
        success: true,
        ...workload
      });
    }

    // 6c. GET /api/v1/officer/applications/:id (Application Detail View)
    const officerAppMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)$/);
    if (method === 'GET' && officerAppMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = officerAppMatch[1];
      const app = getOfficerApplicationDetail(user, appId);
      return sendJson(res, 200, {
        success: true,
        application: app
      });
    }

    // 6d. POST /api/v1/officer/applications/:id/claim (Claim Application)
    const claimMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/claim$/);
    if (method === 'POST' && claimMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = claimMatch[1];
      const body = await readJsonBody(req).catch(() => ({}));
      const app = claimApplication(user, appId, body.expectedVersion);
      return sendJson(res, 200, {
        success: true,
        message: 'Application claimed successfully',
        application: app
      });
    }

    // 6e. POST /api/v1/officer/applications/:id/review (Start Review)
    const reviewMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/review$/);
    if (method === 'POST' && reviewMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = reviewMatch[1];
      const app = startReview(user, appId);
      return sendJson(res, 200, {
        success: true,
        message: 'Application review commenced',
        application: app
      });
    }

    // 6f. POST /api/v1/officer/applications/:id/clarification (Request Clarification)
    const clarMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/clarification$/);
    if (method === 'POST' && clarMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = clarMatch[1];
      const body = await readJsonBody(req);
      const result = requestClarification(user, appId, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Clarification request sent to citizen',
        clarification: result.clarification,
        application: result.app
      });
    }

    // 6g. POST /api/v1/officer/applications/:id/notes (Add Internal Processing Note)
    const noteMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/notes$/);
    if (method === 'POST' && noteMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = noteMatch[1];
      const body = await readJsonBody(req);
      const note = addOfficerNote(user, appId, body);
      return sendJson(res, 201, {
        success: true,
        message: 'Internal note recorded',
        note
      });
    }

    // 6h. POST /api/v1/officer/applications/:id/approve (Approve Application)
    const approveMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/approve$/);
    if (method === 'POST' && approveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = approveMatch[1];
      const body = await readJsonBody(req).catch(() => ({}));
      const app = approveApplication(user, appId, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Application approved successfully',
        application: app
      });
    }

    // 6i. POST /api/v1/officer/applications/:id/reject (Reject Application)
    const rejectMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/reject$/);
    if (method === 'POST' && rejectMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = rejectMatch[1];
      const body = await readJsonBody(req);
      const app = rejectApplication(user, appId, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Application rejected with documented reason',
        application: app
      });
    }

    // 6j. POST /api/v1/officer/applications/:id/complete (Complete / Fulfill Application)
    const completeMatch = pathname.match(/^\/api\/v1\/officer\/applications\/([^/]+)\/complete$/);
    if (method === 'POST' && completeMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const appId = completeMatch[1];
      const body = await readJsonBody(req).catch(() => ({}));
      const app = completeApplication(user, appId, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Application fulfilled and completed',
        application: app
      });
    }

    // 7. GET /api/v1/admin/users (Protected: Admin only)
    if (method === 'GET' && pathname === '/api/v1/admin/users') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);

      const usersList = db.getAllUsersSafe();
      return sendJson(res, 200, {
        success: true,
        totalUsers: usersList.length,
        users: usersList
      });
    }

    // 8. GET /api/v1/admin/departments (Protected: Admin only)
    if (method === 'GET' && pathname === '/api/v1/admin/departments') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);

      const departments = db.getAllDepartments();
      return sendJson(res, 200, {
        success: true,
        departments
      });
    }

    // 9. GET /api/v1/services (Service Catalog List with Search & Filtering)
    if (method === 'GET' && pathname === '/api/v1/services') {
      const search = url.searchParams.get('search') || '';
      const category = url.searchParams.get('category') || 'all';
      const department = url.searchParams.get('department') || 'all';
      const availability = url.searchParams.get('availability') || 'all';

      const filtered = db.getServices({ search, category, department, availability });
      return sendJson(res, 200, {
        success: true,
        count: filtered.length,
        filters: { search, category, department, availability },
        services: filtered
      });
    }

    // 10. GET /api/v1/services/:id (Single Service Details)
    const serviceMatch = pathname.match(/^\/api\/v1\/services\/([^/]+)$/);
    if (method === 'GET' && serviceMatch) {
      const serviceId = serviceMatch[1];
      const service = db.getServiceById(serviceId);
      if (!service) {
        return sendJson(res, 404, { success: false, error: `Service not found with ID: ${serviceId}` });
      }
      return sendJson(res, 200, {
        success: true,
        service
      });
    }

    // 11. GET /api/v1/categories (All Service Categories)
    if (method === 'GET' && pathname === '/api/v1/categories') {
      const categories = db.getServiceCategories();
      return sendJson(res, 200, {
        success: true,
        categories
      });
    }

    // 12. POST /api/v1/applications (Create Draft or Submit Application)
    if (method === 'POST' && pathname === '/api/v1/applications') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const { serviceId, formData = {}, documents = [], status = 'SUBMITTED' } = body;

      if (!serviceId) {
        return sendJson(res, 400, { success: false, error: 'Service ID is required' });
      }

      const service = db.getServiceById(serviceId);
      if (!service) {
        return sendJson(res, 404, { success: false, error: `Service not found with ID: ${serviceId}` });
      }

      const isDraft = status === 'DRAFT';
      const validation = validateApplicationPayload({ service, formData, documents, isDraft });
      if (!validation.isValid) {
        return sendJson(res, 400, { success: false, errors: validation.errors });
      }

      // Enforce citizen ownership from authenticated user token context
      const application = db.createApplication({
        applicantId: user.id,
        applicantName: user.name || formData.fullName,
        serviceId,
        formData,
        documents,
        status: isDraft ? 'DRAFT' : 'SUBMITTED'
      });

      if (!isDraft) {
        safeNotifyApplicationSubmitted(application, user).catch(() => {});
      }

      return sendJson(res, 201, {
        success: true,
        message: isDraft ? 'Application draft saved successfully' : 'Application submitted successfully',
        application
      });
    }

    // 13. GET /api/v1/applications (List Applications for Authenticated User)
    if (method === 'GET' && pathname === '/api/v1/applications') {
      const { user } = authenticateToken(req.headers.authorization);
      let applications = [];

      if (user.role === 'CITIZEN') {
        const filters = {
          status: url.searchParams.get('status') || 'ALL',
          department: url.searchParams.get('department') || 'ALL',
          search: url.searchParams.get('search') || ''
        };
        applications = getCitizenApplications(user, filters);
      } else if (user.role === 'OFFICER') {
        applications = db.getDepartmentalApplications(user.departmentCode);
      } else if (user.role === 'ADMIN') {
        applications = db.getAllDepartments ? db.getDepartmentalApplications('EDUCATION').concat(db.getDepartmentalApplications('REVENUE')) : [];
      }

      return sendJson(res, 200, {
        success: true,
        count: applications.length,
        applications
      });
    }

    // 14. POST /api/v1/applications/:id/submit (Submit an existing Draft)
    const appSubmitMatch = pathname.match(/^\/api\/v1\/applications\/([^/]+)\/submit$/);
    if (method === 'POST' && appSubmitMatch) {
      const appId = appSubmitMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const app = db.getApplicationById(appId);

      if (!app) {
        return sendJson(res, 404, { success: false, error: `Application not found with ID: ${appId}` });
      }

      if (app.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not own this application' });
      }

      const service = db.getServiceById(app.serviceId);
      const validation = validateApplicationPayload({ service, formData: app.formData, documents: app.documents, isDraft: false });
      if (!validation.isValid) {
        return sendJson(res, 400, { success: false, errors: validation.errors });
      }

      const submitted = db.updateApplication(appId, user.id, { status: 'SUBMITTED' });
      safeNotifyApplicationSubmitted(submitted, user).catch(() => {});

      return sendJson(res, 200, {
        success: true,
        message: 'Application submitted successfully',
        application: submitted
      });
    }

    // 15. GET /api/v1/applications/:id (Retrieve Single Application)
    const appGetMatch = pathname.match(/^\/api\/v1\/applications\/([^/]+)$/);
    if (method === 'GET' && appGetMatch) {
      const appId = appGetMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const app = db.getApplicationById(appId);

      if (!app) {
        return sendJson(res, 404, { success: false, error: `Application not found with ID: ${appId}` });
      }

      // Enforce Role & Ownership checks
      if (user.role === 'CITIZEN' && app.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not have permission to view this application' });
      }
      if (user.role === 'OFFICER' && app.departmentCode !== user.departmentCode) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: Officer cannot access applications outside assigned department' });
      }

      let returnApp = app;
      if (user.role === 'CITIZEN' && app.internalNotes) {
        const { internalNotes, ...safeApp } = app;
        returnApp = safeApp;
      }

      return sendJson(res, 200, {
        success: true,
        application: returnApp
      });
    }

    // 15a. GET /api/v1/applications/:id/tracking (Comprehensive Citizen Tracking)
    const appTrackingMatch = pathname.match(/^\/api\/v1\/applications\/([^/]+)\/tracking$/);
    if (method === 'GET' && appTrackingMatch) {
      const appId = appTrackingMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const tracking = getApplicationTracking(user, appId);
      return sendJson(res, 200, {
        success: true,
        tracking
      });
    }

    // 15b. POST /api/v1/applications/:id/clarification/respond (Citizen Responds to Clarification)
    const clarRespondMatch = pathname.match(/^\/api\/v1\/applications\/([^/]+)\/clarification\/respond$/);
    if (method === 'POST' && clarRespondMatch) {
      const appId = clarRespondMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const result = respondToClarification(user, appId, body);
      return sendJson(res, 200, result);
    }

    // 16. PUT /api/v1/applications/:id (Update an existing Draft)
    if (method === 'PUT' && appGetMatch) {
      const appId = appGetMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const app = db.getApplicationById(appId);

      if (!app) {
        return sendJson(res, 404, { success: false, error: `Application not found with ID: ${appId}` });
      }

      if (app.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not own this application' });
      }

      if (app.status === 'SUBMITTED') {
        return sendJson(res, 400, { success: false, error: 'Cannot modify an already submitted application' });
      }

      const body = await readJsonBody(req);
      const updated = db.updateApplication(appId, user.id, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Application draft updated successfully',
        application: updated
      });
    }

    // 17. POST /api/v1/orchestrations (Create/Retrieve Orchestration for Application)
    if (method === 'POST' && pathname === '/api/v1/orchestrations') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const { applicationId } = body;

      if (!applicationId) {
        return sendJson(res, 400, { success: false, error: 'Application ID is required' });
      }

      const app = db.getApplicationById(applicationId);
      if (!app) {
        return sendJson(res, 404, { success: false, error: `Application not found with ID: ${applicationId}` });
      }

      // Check ownership / department access
      if (user.role === 'CITIZEN' && app.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not own this application' });
      }
      if (user.role === 'OFFICER' && app.departmentCode !== user.departmentCode) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: Officer cannot access applications outside assigned department' });
      }

      let orch = db.getOrchestrationByApplicationId(applicationId);
      if (!orch) {
        orch = db.createOrchestration({
          applicationId: app.id,
          applicantId: app.applicantId,
          serviceId: app.serviceId,
          formData: app.formData
        });
        app.orchestrationId = orch.id;
      }

      return sendJson(res, 200, {
        success: true,
        orchestration: orch
      });
    }

    // 18. GET /api/v1/orchestrations (List Orchestrations)
    if (method === 'GET' && pathname === '/api/v1/orchestrations') {
      const { user } = authenticateToken(req.headers.authorization);
      let list = [];

      if (user.role === 'CITIZEN') {
        list = db.getCitizenOrchestrations(user.id);
      } else if (user.role === 'OFFICER') {
        list = db.getDepartmentalOrchestrations(user.departmentCode);
      } else if (user.role === 'ADMIN') {
        list = db.getAllOrchestrations();
      }

      return sendJson(res, 200, {
        success: true,
        count: list.length,
        orchestrations: list
      });
    }

    // 19. POST /api/v1/orchestrations/:id/execute (Execute Next Tasks in DAG)
    const orchExecMatch = pathname.match(/^\/api\/v1\/orchestrations\/([^/]+)\/execute$/);
    if (method === 'POST' && orchExecMatch) {
      const orchId = orchExecMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const orch = db.getOrchestrationById(orchId);

      if (!orch) {
        return sendJson(res, 404, { success: false, error: `Orchestration not found with ID: ${orchId}` });
      }

      if (user.role === 'CITIZEN' && orch.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not own this orchestration' });
      }
      if (user.role === 'OFFICER' && orch.departmentCode !== user.departmentCode) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: Officer cannot access orchestrations outside assigned department' });
      }

      const body = await readJsonBody(req);
      const maxSteps = body.maxSteps || 10;
      const context = body.context || {};

      await stepOrchestration(orch, { maxSteps, context });

      // Update linked application's stage
      const app = db.getApplicationById(orch.applicationId);
      if (app) {
        if (orch.status === ORCHESTRATION_STATUS.COMPLETED) {
          app.currentStage = 'All Department Interoperability Verifications Approved';
        } else if (orch.status === ORCHESTRATION_STATUS.FAILED) {
          app.currentStage = 'Orchestration Task Failed — Manual Scrutiny Required';
        } else {
          const inProgTask = orch.tasks.find(t => t.status === TASK_STATUS.IN_PROGRESS || t.status === TASK_STATUS.READY);
          if (inProgTask) {
            app.currentStage = `Smart Orchestration: ${inProgTask.title}`;
          }
        }
      }

      return sendJson(res, 200, {
        success: true,
        orchestration: orch
      });
    }

    // 20. POST /api/v1/orchestrations/:id/retry (Retry a Failed or Blocked Task)
    const orchRetryMatch = pathname.match(/^\/api\/v1\/orchestrations\/([^/]+)\/retry$/);
    if (method === 'POST' && orchRetryMatch) {
      const orchId = orchRetryMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const orch = db.getOrchestrationById(orchId);

      if (!orch) {
        return sendJson(res, 404, { success: false, error: `Orchestration not found with ID: ${orchId}` });
      }

      if (user.role === 'CITIZEN' && orch.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not own this orchestration' });
      }
      if (user.role === 'OFFICER' && orch.departmentCode !== user.departmentCode) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: Officer cannot access orchestrations outside assigned department' });
      }

      const body = await readJsonBody(req);
      const taskCode = body.taskCode;
      const context = body.context || {};

      // Reset target task or first failed task
      let targetTask = taskCode ? orch.tasks.find(t => t.code === taskCode) : orch.tasks.find(t => t.status === TASK_STATUS.FAILED);
      if (targetTask) {
        targetTask.status = TASK_STATUS.READY;
        targetTask.error = null;
        targetTask.retryCount = 0;
      }

      // Unblock downstream tasks that were blocked
      updateTaskDependencies(orch.tasks);

      // Execute next step
      await stepOrchestration(orch, { maxSteps: 10, context });

      return sendJson(res, 200, {
        success: true,
        message: 'Task retry initiated successfully',
        orchestration: orch
      });
    }

    // 21. GET /api/v1/orchestrations/:id (Retrieve Single Orchestration)
    const orchGetMatch = pathname.match(/^\/api\/v1\/orchestrations\/([^/]+)$/);
    if (method === 'GET' && orchGetMatch) {
      const orchId = orchGetMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const orch = db.getOrchestrationById(orchId);

      if (!orch) {
        return sendJson(res, 404, { success: false, error: `Orchestration not found with ID: ${orchId}` });
      }

      if (user.role === 'CITIZEN' && orch.applicantId !== user.id) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: You do not own this orchestration' });
      }
      if (user.role === 'OFFICER' && orch.departmentCode !== user.departmentCode) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: Officer cannot access orchestrations outside assigned department' });
      }

      return sendJson(res, 200, {
        success: true,
        orchestration: orch
      });
    }

    // 22. GET /api/v1/adapters (List Registered Department Adapters)
    if (method === 'GET' && pathname === '/api/v1/adapters') {
      const adapters = adapterRegistry.listAdapters();
      return sendJson(res, 200, {
        success: true,
        count: adapters.length,
        adapters
      });
    }

    // 23. GET /api/v1/adapters/:code/health (Adapter Health Check)
    const adapterHealthMatch = pathname.match(/^\/api\/v1\/adapters\/([^/]+)\/health$/);
    if (method === 'GET' && adapterHealthMatch) {
      const adapterCode = adapterHealthMatch[1];
      const adapter = adapterRegistry.getAdapter(adapterCode);
      if (!adapter) {
        return sendJson(res, 404, { success: false, error: `Department adapter not found for code: ${adapterCode}` });
      }

      const health = await adapter.healthCheck();
      return sendJson(res, 200, {
        success: true,
        health
      });
    }

    // 24. POST /api/v1/adapters/:code/execute (Direct Adapter Execution)
    const adapterExecMatch = pathname.match(/^\/api\/v1\/adapters\/([^/]+)\/execute$/);
    if (method === 'POST' && adapterExecMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const adapterCode = adapterExecMatch[1];
      const adapter = adapterRegistry.getAdapter(adapterCode);
      if (!adapter) {
        return sendJson(res, 404, { success: false, error: `Department adapter not found for code: ${adapterCode}` });
      }

      const body = await readJsonBody(req);
      const task = body.task || { code: 'TASK_VERIFY', title: 'Direct Verification Request' };
      const context = body.context || {};
      context.requestId = req.requestId;

      const result = await adapter.executeTask(task, context);
      const statusCode = result.success ? 200 : 400;
      return sendJson(res, statusCode, result);
    }

    // 25. GET /api/v1/standardization/schemas
    if (method === 'GET' && pathname === '/api/v1/standardization/schemas') {
      return sendJson(res, 200, {
        success: true,
        version: CANONICAL_VERSION,
        schemas: SCHEMAS
      });
    }

    // 26. POST /api/v1/standardization/validate
    if (method === 'POST' && pathname === '/api/v1/standardization/validate') {
      const body = await readJsonBody(req);
      const schemaType = (body.type || 'Citizen').toLowerCase();
      const payload = body.data || body;

      let result;
      if (schemaType === 'citizen') {
        result = validateCitizen(payload);
      } else if (schemaType === 'address') {
        result = validateAddress(payload);
      } else if (schemaType === 'application') {
        result = validateApplication(payload);
      } else {
        return sendJson(res, 400, { success: false, error: `Unknown schema type: ${schemaType}. Expected: citizen, address, application` });
      }

      const statusCode = result.valid ? 200 : 422;
      return sendJson(res, statusCode, {
        success: result.valid,
        valid: result.valid,
        version: CANONICAL_VERSION,
        errors: result.errors
      });
    }

    // 27. POST /api/v1/standardization/normalize
    if (method === 'POST' && pathname === '/api/v1/standardization/normalize') {
      const body = await readJsonBody(req);
      const department = body.department || body.departmentCode || 'GENERIC';
      const payload = body.data || body.payload || body;

      const canonical = normalizeDepartmentPayload(department, payload);
      return sendJson(res, 200, {
        success: true,
        department,
        canonicalVersion: CANONICAL_VERSION,
        canonical
      });
    }

    // 28. POST /api/v1/standardization/transform
    if (method === 'POST' && pathname === '/api/v1/standardization/transform') {
      const body = await readJsonBody(req);
      const targetDepartment = body.targetDepartment || body.department || 'GENERIC';
      const canonicalData = body.canonical || body.data || body;

      const transformed = transformCanonicalToDepartment(targetDepartment, canonicalData);
      return sendJson(res, 200, {
        success: true,
        targetDepartment,
        data: transformed
      });
    }

    // 29. GET /api/v1/exchange/policies
    if (method === 'GET' && pathname === '/api/v1/exchange/policies') {
      return sendJson(res, 200, {
        success: true,
        policies: EXCHANGE_POLICIES
      });
    }

    // 30. POST /api/v1/exchange/requests (Initiate Data Exchange Request)
    if (method === 'POST' && pathname === '/api/v1/exchange/requests') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);

      const exchange = dataExchangeService.createExchangeRequest({
        sourceDepartment: body.sourceDepartment,
        targetDepartment: body.targetDepartment,
        applicationId: body.applicationId,
        citizenId: user.role === 'CITIZEN' ? user.id : body.citizenId,
        purpose: body.purpose,
        requestedFields: body.requestedFields,
        citizenConsentGiven: body.citizenConsentGiven !== undefined ? body.citizenConsentGiven : true,
        requestId: req.requestId
      });

      const statusCode = exchange.status === EXCHANGE_STATUS.AUTHORIZED ? 201 : 403;
      return sendJson(res, statusCode, {
        success: exchange.status === EXCHANGE_STATUS.AUTHORIZED,
        exchange
      });
    }

    // 31. GET /api/v1/exchange/requests/:id (Retrieve Exchange Details)
    const exchangeGetMatch = pathname.match(/^\/api\/v1\/exchange\/requests\/([^/]+)$/);
    if (method === 'GET' && exchangeGetMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const exchangeId = exchangeGetMatch[1];
      const exchange = dataExchangeService.getExchangeById(exchangeId);

      if (!exchange) {
        return sendJson(res, 404, { success: false, error: `Data exchange request not found: ${exchangeId}` });
      }

      // Security / RBAC check
      if (user.role === 'CITIZEN') {
        const app = db.getApplicationById(exchange.applicationId);
        if (exchange.citizenId !== user.id && (!app || app.applicantId !== user.id)) {
          return sendJson(res, 403, { success: false, error: 'Access Denied: You do not have permission to view this exchange' });
        }
      } else if (user.role === 'OFFICER') {
        if (exchange.sourceDepartment !== user.departmentCode && exchange.targetDepartment !== user.departmentCode) {
          return sendJson(res, 403, { success: false, error: 'Access Denied: Officer can only access exchanges involving assigned department' });
        }
      }

      return sendJson(res, 200, {
        success: true,
        exchange
      });
    }

    // 32. POST /api/v1/exchange/requests/:id/execute (Execute Transfer)
    const exchangeExecMatch = pathname.match(/^\/api\/v1\/exchange\/requests\/([^/]+)\/execute$/);
    if (method === 'POST' && exchangeExecMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const exchangeId = exchangeExecMatch[1];
      const exchange = dataExchangeService.getExchangeById(exchangeId);

      if (!exchange) {
        return sendJson(res, 404, { success: false, error: `Data exchange request not found: ${exchangeId}` });
      }

      // RBAC: Officers or Admins can trigger execution
      if (user.role === 'OFFICER' && exchange.sourceDepartment !== user.departmentCode && exchange.targetDepartment !== user.departmentCode) {
        return sendJson(res, 403, { success: false, error: 'Access Denied: Unauthorized to execute this exchange' });
      }

      const body = await readJsonBody(req);
      const result = await dataExchangeService.executeExchange(exchangeId, {
        requestId: req.requestId,
        sourceData: body.sourceData,
        simulateTimeout: body.simulateTimeout,
        simulateDownstreamFailure: body.simulateDownstreamFailure,
        failureReason: body.failureReason
      });

      return sendJson(res, 200, result);
    }

    // 33. GET /api/v1/exchange/audit (Retrieve Exchange Audit Logs)
    if (method === 'GET' && pathname === '/api/v1/exchange/audit') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['OFFICER', 'ADMIN']);

      const filter = {};
      if (user.role === 'OFFICER') {
        filter.department = user.departmentCode;
      }
      const logs = dataExchangeService.getAuditLogs(filter);

      return sendJson(res, 200, {
        success: true,
        count: logs.length,
        logs
      });
    }

    // ==========================================
    // PHASE 13 — DIGITAL DOCUMENT VAULT ENDPOINTS
    // ==========================================

    // 34. GET /api/v1/vault/types (Retrieve Configured Document Types)
    if (method === 'GET' && pathname === '/api/v1/vault/types') {
      const types = getDocumentTypes();
      return sendJson(res, 200, {
        success: true,
        count: types.length,
        documentTypes: types
      });
    }

    // 35. POST /api/v1/vault/documents (Upload New Vault Document)
    if (method === 'POST' && pathname === '/api/v1/vault/documents') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const document = await uploadDocument(user, body);
      return sendJson(res, 201, {
        success: true,
        message: 'Document uploaded and secured in Digital Vault',
        document
      });
    }

    // 36. GET /api/v1/vault/documents (List Citizen's Vault Documents)
    if (method === 'GET' && pathname === '/api/v1/vault/documents') {
      const { user } = authenticateToken(req.headers.authorization);
      const filters = {
        type: url.searchParams.get('type') || 'ALL',
        status: url.searchParams.get('status') || 'ALL',
        search: url.searchParams.get('search') || ''
      };
      const documents = listCitizenDocuments(user, filters);
      return sendJson(res, 200, {
        success: true,
        count: documents.length,
        documents
      });
    }

    // 37. GET /api/v1/vault/documents/:id (Get Document Metadata)
    const vaultDocMatch = pathname.match(/^\/api\/v1\/vault\/documents\/([^/]+)$/);
    if (method === 'GET' && vaultDocMatch) {
      const docId = vaultDocMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const document = getDocumentMetadata(user, docId);
      return sendJson(res, 200, {
        success: true,
        document
      });
    }

    // 38. GET /api/v1/vault/documents/:id/download (Secure File Download)
    const vaultDownloadMatch = pathname.match(/^\/api\/v1\/vault\/documents\/([^/]+)\/download$/);
    if (method === 'GET' && vaultDownloadMatch) {
      const docId = vaultDownloadMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const file = await downloadDocument(user, docId);

      const acceptHeader = req.headers['accept'] || '';
      if (acceptHeader.includes('application/json')) {
        return sendJson(res, 200, {
          success: true,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          dataBase64: file.buffer.toString('base64')
        });
      }

      res.writeHead(200, {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.fileName}"`,
        'Content-Length': file.buffer.length,
        'X-Request-Id': req.requestId || ''
      });
      return res.end(file.buffer);
    }

    // 39. DELETE /api/v1/vault/documents/:id (Delete Document)
    if (method === 'DELETE' && vaultDocMatch) {
      const docId = vaultDocMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const result = await deleteDocument(user, docId);
      return sendJson(res, 200, result);
    }

    // 40. POST /api/v1/vault/documents/:id/associate (Associate with Application)
    const vaultAssocMatch = pathname.match(/^\/api\/v1\/vault\/documents\/([^/]+)\/associate$/);
    if (method === 'POST' && vaultAssocMatch) {
      const docId = vaultAssocMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      if (!body.applicationId) {
        return sendJson(res, 400, { success: false, error: 'applicationId is required' });
      }
      const result = associateDocumentWithApplication(user, docId, body.applicationId);
      return sendJson(res, 200, result);
    }

    // 41. GET /api/v1/vault/audit (Retrieve Vault Audit Logs)
    if (method === 'GET' && pathname === '/api/v1/vault/audit') {
      const { user } = authenticateToken(req.headers.authorization);
      const documentId = url.searchParams.get('documentId') || null;
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const logs = getVaultAuditLogs(user, { documentId, limit });
      return sendJson(res, 200, {
        success: true,
        count: logs.length,
        logs
      });
    }

    // ==========================================
    // PHASE 14 — NOTIFICATION SYSTEM ENDPOINTS
    // ==========================================

    // 42. GET /api/v1/notifications/types (List Configured Notification Types)
    if (method === 'GET' && pathname === '/api/v1/notifications/types') {
      const types = getNotificationTypes();
      return sendJson(res, 200, {
        success: true,
        count: types.length,
        notificationTypes: types
      });
    }

    // 43. GET /api/v1/notifications/unread-count (Get Count of Unread Notifications)
    if (method === 'GET' && pathname === '/api/v1/notifications/unread-count') {
      const { user } = authenticateToken(req.headers.authorization);
      const unreadCount = getUnreadCount(user);
      return sendJson(res, 200, {
        success: true,
        unreadCount
      });
    }

    // 44. GET /api/v1/notifications/preferences (Get User Notification Preferences)
    if (method === 'GET' && pathname === '/api/v1/notifications/preferences') {
      const { user } = authenticateToken(req.headers.authorization);
      const preferences = getPreferences(user);
      return sendJson(res, 200, {
        success: true,
        preferences
      });
    }

    // 45. PUT /api/v1/notifications/preferences (Update User Notification Preferences)
    if (method === 'PUT' && pathname === '/api/v1/notifications/preferences') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const preferences = updatePreferences(user, body);
      return sendJson(res, 200, {
        success: true,
        message: 'Notification preferences updated',
        preferences
      });
    }

    // 46. POST /api/v1/notifications/mark-all-read (Mark All as Read)
    if (method === 'POST' && pathname === '/api/v1/notifications/mark-all-read') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = markAllAsRead(user);
      return sendJson(res, 200, result);
    }

    // 47. GET /api/v1/notifications (List Notifications for Authenticated User)
    if (method === 'GET' && pathname === '/api/v1/notifications') {
      const { user } = authenticateToken(req.headers.authorization);
      const filters = {
        status: url.searchParams.get('status') || 'ALL',
        type: url.searchParams.get('type') || 'ALL',
        limit: url.searchParams.get('limit') || '50',
        offset: url.searchParams.get('offset') || '0'
      };
      const result = getUserNotifications(user, filters);
      return sendJson(res, 200, {
        success: true,
        ...result
      });
    }

    // 48. POST /api/v1/notifications/:id/read (Mark Single Notification as Read)
    const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
    if (method === 'POST' && notifReadMatch) {
      const notifId = notifReadMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const updated = markAsRead(user, notifId);
      return sendJson(res, 200, {
        success: true,
        notification: updated
      });
    }

    // 49. DELETE /api/v1/notifications/:id or POST /archive (Archive Notification)
    const notifArchiveMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)(\/archive)?$/);
    if ((method === 'DELETE' || method === 'POST') && notifArchiveMatch && !pathname.endsWith('/read')) {
      const notifId = notifArchiveMatch[1];
      const { user } = authenticateToken(req.headers.authorization);
      const result = archiveNotification(user, notifId);
      return sendJson(res, 200, result);
    }

    // 50. POST /api/v1/notifications (Create System/Officer Notification)
    if (method === 'POST' && pathname === '/api/v1/notifications') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['OFFICER', 'ADMIN']);
      const body = await readJsonBody(req);
      const notification = await createNotification(body);
      return sendJson(res, 201, {
        success: true,
        notification
      });
    }

    // ==========================================
    // PHASE 15 — AI GOVERNMENT HELP CHATBOT ENDPOINTS
    // ==========================================

    // 51. GET /api/v1/chatbot/suggestions (Get Prompt Suggestions)
    if (method === 'GET' && pathname === '/api/v1/chatbot/suggestions') {
      const suggestions = getSuggestedPrompts();
      return sendJson(res, 200, {
        success: true,
        count: suggestions.length,
        suggestions
      });
    }

    // 52. POST /api/v1/chatbot/sessions (Create New Chat Session)
    if (method === 'POST' && pathname === '/api/v1/chatbot/sessions') {
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const session = createChatSession(user);
      return sendJson(res, 201, {
        success: true,
        session
      });
    }

    // 53. GET /api/v1/chatbot/sessions/:id (Get Session Conversation)
    const chatSessionMatch = pathname.match(/^\/api\/v1\/chatbot\/sessions\/([^/]+)$/);
    if (method === 'GET' && chatSessionMatch) {
      const sessionId = chatSessionMatch[1];
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const session = getChatSession(user, sessionId);
      return sendJson(res, 200, {
        success: true,
        session
      });
    }

    // 54. POST /api/v1/chatbot/sessions/:id/messages (Send User Message)
    const chatMsgMatch = pathname.match(/^\/api\/v1\/chatbot\/sessions\/([^/]+)\/messages$/);
    if (method === 'POST' && chatMsgMatch) {
      const sessionId = chatMsgMatch[1];
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const body = await readJsonBody(req);
      const result = await sendMessage(user, { sessionId, message: body.message });
      return sendJson(res, 200, {
        success: true,
        reply: result.reply,
        sessionId: result.session.sessionId
      });
    }

    // 55. DELETE /api/v1/chatbot/sessions/:id (Clear Session History)
    if (method === 'DELETE' && chatSessionMatch) {
      const sessionId = chatSessionMatch[1];
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const result = clearChatSession(user, sessionId);
      return sendJson(res, 200, result);
    }

    // ==========================================
    // PHASE 16 — EMPLOYMENT HUB ENDPOINTS
    // ==========================================

    // 56. GET /api/v1/employment/opportunities/recommended
    if (method === 'GET' && pathname === '/api/v1/employment/opportunities/recommended') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = getRecommendedOpportunities(user);
      return sendJson(res, 200, result);
    }

    // 57. GET /api/v1/employment/saved (List Saved Opportunities)
    if (method === 'GET' && pathname === '/api/v1/employment/saved') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = getSavedOpportunities(user);
      return sendJson(res, 200, result);
    }

    // 58. POST /api/v1/employment/saved/:id (Save Opportunity)
    const empSaveMatch = pathname.match(/^\/api\/v1\/employment\/saved\/([^/]+)$/);
    if (method === 'POST' && empSaveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const oppId = empSaveMatch[1];
      const result = saveOpportunity(user, oppId);
      return sendJson(res, 200, result);
    }

    // 59. DELETE /api/v1/employment/saved/:id (Remove Saved Opportunity)
    if (method === 'DELETE' && empSaveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const oppId = empSaveMatch[1];
      const result = removeSavedOpportunity(user, oppId);
      return sendJson(res, 200, result);
    }

    // 60. GET /api/v1/employment/opportunities (List & Search Opportunities)
    if (method === 'GET' && pathname === '/api/v1/employment/opportunities') {
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const filters = {
        search: url.searchParams.get('search') || '',
        category: url.searchParams.get('category') || '',
        opportunityType: url.searchParams.get('opportunityType') || '',
        qualification: url.searchParams.get('qualification') || '',
        status: url.searchParams.get('status') || '',
        closingSoon: url.searchParams.get('closingSoon') === 'true',
        sort: url.searchParams.get('sort') || 'newest',
        limit: url.searchParams.get('limit') || '50',
        offset: url.searchParams.get('offset') || '0'
      };
      const result = listOpportunities(filters, user);
      return sendJson(res, 200, result);
    }

    // 61. POST /api/v1/employment/opportunities (Admin: Create Opportunity)
    if (method === 'POST' && pathname === '/api/v1/employment/opportunities') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const body = await readJsonBody(req);
      const result = createOpportunity(user, body);
      return sendJson(res, 201, result);
    }

    // 62. GET /api/v1/employment/opportunities/:id (Get Opportunity Details)
    const empIdMatch = pathname.match(/^\/api\/v1\/employment\/opportunities\/([^/]+)$/);
    if (method === 'GET' && empIdMatch) {
      const oppId = empIdMatch[1];
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const result = getOpportunityById(oppId, user);
      return sendJson(res, 200, result);
    }

    // 63. PUT /api/v1/employment/opportunities/:id (Admin: Update Opportunity)
    if (method === 'PUT' && empIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const oppId = empIdMatch[1];
      const body = await readJsonBody(req);
      const result = updateOpportunity(user, oppId, body);
      return sendJson(res, 200, result);
    }

    // 64. DELETE /api/v1/employment/opportunities/:id (Admin: Deactivate Opportunity)
    if (method === 'DELETE' && empIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const oppId = empIdMatch[1];
      const result = deleteOpportunity(user, oppId);
      return sendJson(res, 200, result);
    }

    // ==========================================
    // PHASE 17 — SCHOLARSHIP, SCHEME & NEWS HUB ENDPOINTS
    // ==========================================

    // --- A. SCHOLARSHIPS ---

    // 65. GET /api/v1/content/scholarships/saved
    if (method === 'GET' && pathname === '/api/v1/content/scholarships/saved') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = getSavedScholarships(user);
      return sendJson(res, 200, result);
    }

    // 66. POST /api/v1/content/scholarships/saved/:id
    const schSaveMatch = pathname.match(/^\/api\/v1\/content\/scholarships\/saved\/([^/]+)$/);
    if (method === 'POST' && schSaveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = schSaveMatch[1];
      const result = saveScholarship(user, id);
      return sendJson(res, 200, result);
    }

    // 67. DELETE /api/v1/content/scholarships/saved/:id
    if (method === 'DELETE' && schSaveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = schSaveMatch[1];
      const result = removeSavedScholarship(user, id);
      return sendJson(res, 200, result);
    }

    // 68. GET /api/v1/content/scholarships
    if (method === 'GET' && pathname === '/api/v1/content/scholarships') {
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const filters = {
        search: url.searchParams.get('search') || '',
        category: url.searchParams.get('category') || '',
        status: url.searchParams.get('status') || '',
        closingSoon: url.searchParams.get('closingSoon') === 'true',
        sort: url.searchParams.get('sort') || 'newest',
        limit: url.searchParams.get('limit') || '50',
        offset: url.searchParams.get('offset') || '0'
      };
      const result = listScholarships(filters, user);
      return sendJson(res, 200, result);
    }

    // 69. POST /api/v1/content/scholarships (Admin: Create)
    if (method === 'POST' && pathname === '/api/v1/content/scholarships') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const body = await readJsonBody(req);
      const result = createScholarship(user, body);
      return sendJson(res, 201, result);
    }

    // 70. GET /api/v1/content/scholarships/:id
    const schIdMatch = pathname.match(/^\/api\/v1\/content\/scholarships\/([^/]+)$/);
    if (method === 'GET' && schIdMatch && schIdMatch[1] !== 'saved') {
      const id = schIdMatch[1];
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const result = getScholarshipById(id, user);
      return sendJson(res, 200, result);
    }

    // 71. PUT /api/v1/content/scholarships/:id (Admin: Update)
    if (method === 'PUT' && schIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const id = schIdMatch[1];
      const body = await readJsonBody(req);
      const result = updateScholarship(user, id, body);
      return sendJson(res, 200, result);
    }

    // 72. DELETE /api/v1/content/scholarships/:id (Admin: Deactivate)
    if (method === 'DELETE' && schIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const id = schIdMatch[1];
      const result = deleteScholarship(user, id);
      return sendJson(res, 200, result);
    }

    // --- B. GOVERNMENT SCHEMES ---

    // 73. GET /api/v1/content/schemes/saved
    if (method === 'GET' && pathname === '/api/v1/content/schemes/saved') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = getSavedSchemes(user);
      return sendJson(res, 200, result);
    }

    // 74. POST /api/v1/content/schemes/saved/:id
    const scSaveMatch = pathname.match(/^\/api\/v1\/content\/schemes\/saved\/([^/]+)$/);
    if (method === 'POST' && scSaveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = scSaveMatch[1];
      const result = saveScheme(user, id);
      return sendJson(res, 200, result);
    }

    // 75. DELETE /api/v1/content/schemes/saved/:id
    if (method === 'DELETE' && scSaveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = scSaveMatch[1];
      const result = removeSavedScheme(user, id);
      return sendJson(res, 200, result);
    }

    // 76. GET /api/v1/content/schemes
    if (method === 'GET' && pathname === '/api/v1/content/schemes') {
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const filters = {
        search: url.searchParams.get('search') || '',
        category: url.searchParams.get('category') || '',
        department: url.searchParams.get('department') || '',
        status: url.searchParams.get('status') || '',
        limit: url.searchParams.get('limit') || '50',
        offset: url.searchParams.get('offset') || '0'
      };
      const result = listSchemes(filters, user);
      return sendJson(res, 200, result);
    }

    // 77. POST /api/v1/content/schemes (Admin: Create)
    if (method === 'POST' && pathname === '/api/v1/content/schemes') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const body = await readJsonBody(req);
      const result = createScheme(user, body);
      return sendJson(res, 201, result);
    }

    // 78. GET /api/v1/content/schemes/:id
    const scIdMatch = pathname.match(/^\/api\/v1\/content\/schemes\/([^/]+)$/);
    if (method === 'GET' && scIdMatch && scIdMatch[1] !== 'saved') {
      const id = scIdMatch[1];
      let user = null;
      if (req.headers.authorization) {
        try {
          const auth = authenticateToken(req.headers.authorization);
          user = auth.user;
        } catch (e) {}
      }
      const result = getSchemeById(id, user);
      return sendJson(res, 200, result);
    }

    // 79. PUT /api/v1/content/schemes/:id (Admin: Update)
    if (method === 'PUT' && scIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const id = scIdMatch[1];
      const body = await readJsonBody(req);
      const result = updateScheme(user, id, body);
      return sendJson(res, 200, result);
    }

    // 80. DELETE /api/v1/content/schemes/:id (Admin: Deactivate)
    if (method === 'DELETE' && scIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const id = scIdMatch[1];
      const result = deleteScheme(user, id);
      return sendJson(res, 200, result);
    }

    // --- C. ANNOUNCEMENTS & NEWS ---

    // 81. GET /api/v1/content/announcements
    if (method === 'GET' && pathname === '/api/v1/content/announcements') {
      const filters = {
        search: url.searchParams.get('search') || '',
        category: url.searchParams.get('category') || '',
        status: url.searchParams.get('status') || '',
        limit: url.searchParams.get('limit') || '50',
        offset: url.searchParams.get('offset') || '0'
      };
      const result = listAnnouncements(filters);
      return sendJson(res, 200, result);
    }

    // 82. POST /api/v1/content/announcements (Admin: Create)
    if (method === 'POST' && pathname === '/api/v1/content/announcements') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const body = await readJsonBody(req);
      const result = createAnnouncement(user, body);
      return sendJson(res, 201, result);
    }

    // 83. GET /api/v1/content/announcements/:id
    const annIdMatch = pathname.match(/^\/api\/v1\/content\/announcements\/([^/]+)$/);
    if (method === 'GET' && annIdMatch) {
      const id = annIdMatch[1];
      const result = getAnnouncementById(id);
      return sendJson(res, 200, result);
    }

    // 84. PUT /api/v1/content/announcements/:id (Admin: Update)
    if (method === 'PUT' && annIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const id = annIdMatch[1];
      const body = await readJsonBody(req);
      const result = updateAnnouncement(user, id, body);
      return sendJson(res, 200, result);
    }

    // 85. DELETE /api/v1/content/announcements/:id (Admin: Archive)
    if (method === 'DELETE' && annIdMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const id = annIdMatch[1];
      const result = deleteAnnouncement(user, id);
      return sendJson(res, 200, result);
    }

    // ==========================================
    // PHASE 18 — PERSONALIZED INFORMATION ENDPOINTS
    // ==========================================

    // 86. GET /api/v1/personalization/preferences
    if (method === 'GET' && pathname === '/api/v1/personalization/preferences') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = getPersonalizationPreferences(user);
      return sendJson(res, 200, result);
    }

    // 87. PUT /api/v1/personalization/preferences
    if (method === 'PUT' && pathname === '/api/v1/personalization/preferences') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const result = updatePersonalizationPreferences(user, body);
      return sendJson(res, 200, result);
    }

    // 88. DELETE /api/v1/personalization/preferences (Reset to defaults)
    if (method === 'DELETE' && pathname === '/api/v1/personalization/preferences') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = resetPersonalizationPreferences(user);
      return sendJson(res, 200, result);
    }

    // 89. GET /api/v1/personalization/dashboard (Combined personalized overview)
    if (method === 'GET' && pathname === '/api/v1/personalization/dashboard') {
      const { user } = authenticateToken(req.headers.authorization);
      const result = getPersonalizedDashboard(user);
      return sendJson(res, 200, result);
    }

    // 90. GET /api/v1/personalization/services
    if (method === 'GET' && pathname === '/api/v1/personalization/services') {
      const { user } = authenticateToken(req.headers.authorization);
      const limit = url.searchParams.get('limit') || '10';
      const result = getRecommendedServices(user, { limit });
      return sendJson(res, 200, result);
    }

    // 91. GET /api/v1/personalization/scholarships
    if (method === 'GET' && pathname === '/api/v1/personalization/scholarships') {
      const { user } = authenticateToken(req.headers.authorization);
      const limit = url.searchParams.get('limit') || '10';
      const result = getRecommendedScholarships(user, { limit });
      return sendJson(res, 200, result);
    }

    // 92. GET /api/v1/personalization/schemes
    if (method === 'GET' && pathname === '/api/v1/personalization/schemes') {
      const { user } = authenticateToken(req.headers.authorization);
      const limit = url.searchParams.get('limit') || '10';
      const result = getRecommendedSchemes(user, { limit });
      return sendJson(res, 200, result);
    }

    // 93. GET /api/v1/personalization/employment
    if (method === 'GET' && pathname === '/api/v1/personalization/employment') {
      const { user } = authenticateToken(req.headers.authorization);
      const limit = url.searchParams.get('limit') || '10';
      const result = getRecommendedEmployment(user, { limit });
      return sendJson(res, 200, result);
    }

    // 94. GET /api/v1/personalization/announcements
    if (method === 'GET' && pathname === '/api/v1/personalization/announcements') {
      const { user } = authenticateToken(req.headers.authorization);
      const limit = url.searchParams.get('limit') || '10';
      const result = getRecommendedAnnouncements(user, { limit });
      return sendJson(res, 200, result);
    }

    // 95. POST /api/v1/personalization/dismiss/:id
    const dismissMatch = pathname.match(/^\/api\/v1\/personalization\/dismiss\/([^/]+)$/);
    if (method === 'POST' && dismissMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const recId = dismissMatch[1];
      const result = dismissRecommendation(user, recId);
      return sendJson(res, 200, result);
    }

    // 96. DELETE /api/v1/personalization/dismiss/:id
    if (method === 'DELETE' && dismissMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const recId = dismissMatch[1];
      const result = restoreRecommendation(user, recId);
      return sendJson(res, 200, result);
    }

    // 97. GET /api/v1/personalization/metrics (Admin only)
    if (method === 'GET' && pathname === '/api/v1/personalization/metrics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getPersonalizationMetrics(user);
      return sendJson(res, 200, result);
    }

    // ==========================================
    // PHASE 19 — FEEDBACK & GRIEVANCE ENDPOINTS
    // ==========================================

    // 98. POST /api/v1/grievances (Citizen: submit grievance)
    if (method === 'POST' && pathname === '/api/v1/grievances') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const result = await createGrievance(user, body);
      return sendJson(res, 201, result);
    }

    // 99. GET /api/v1/grievances (List grievances with RBAC filtering)
    if (method === 'GET' && pathname === '/api/v1/grievances') {
      const { user } = authenticateToken(req.headers.authorization);
      const filters = {
        departmentId: url.searchParams.get('departmentId'),
        status: url.searchParams.get('status'),
        category: url.searchParams.get('category'),
        priority: url.searchParams.get('priority'),
        search: url.searchParams.get('search'),
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset')
      };
      const result = listGrievances(user, filters);
      return sendJson(res, 200, result);
    }

    // 100. GET /api/v1/grievances/categories (Configurable grievance categories)
    if (method === 'GET' && pathname === '/api/v1/grievances/categories') {
      return sendJson(res, 200, {
        success: true,
        categories: GRIEVANCE_CATEGORIES
      });
    }

    // 101. GET /api/v1/grievances/analytics (Admin: Aggregated analytics)
    if (method === 'GET' && pathname === '/api/v1/grievances/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getGrievanceAnalytics(user);
      return sendJson(res, 200, result);
    }

    // Parametric Grievance Routes
    const grvIdMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)$/);
    const grvClaimMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/claim$/);
    const grvNotesMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/notes$/);
    const grvClarifyMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/clarification$/);
    const grvRespondMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/respond$/);
    const grvResolveMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/resolve$/);
    const grvRejectMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/reject$/);
    const grvCloseMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/close$/);
    const grvTimelineMatch = pathname.match(/^\/api\/v1\/grievances\/([^/]+)\/timeline$/);

    // 102. GET /api/v1/grievances/:id
    if (method === 'GET' && grvIdMatch && !['categories', 'analytics'].includes(grvIdMatch[1])) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvIdMatch[1];
      const result = getGrievanceById(user, id);
      return sendJson(res, 200, result);
    }

    // 103. POST /api/v1/grievances/:id/claim
    if (method === 'POST' && grvClaimMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvClaimMatch[1];
      const result = await claimGrievance(user, id);
      return sendJson(res, 200, result);
    }

    // 104. POST /api/v1/grievances/:id/notes
    if (method === 'POST' && grvNotesMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvNotesMatch[1];
      const body = await readJsonBody(req);
      const result = addGrievanceInternalNote(user, id, body.note);
      return sendJson(res, 201, result);
    }

    // 105. POST /api/v1/grievances/:id/clarification
    if (method === 'POST' && grvClarifyMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvClarifyMatch[1];
      const body = await readJsonBody(req);
      const result = await requestGrievanceClarification(user, id, body.question);
      return sendJson(res, 200, result);
    }

    // 106. POST /api/v1/grievances/:id/respond
    if (method === 'POST' && grvRespondMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvRespondMatch[1];
      const body = await readJsonBody(req);
      const result = await respondToGrievanceClarification(user, id, body);
      return sendJson(res, 200, result);
    }

    // 107. POST /api/v1/grievances/:id/resolve
    if (method === 'POST' && grvResolveMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvResolveMatch[1];
      const body = await readJsonBody(req);
      const result = await resolveGrievance(user, id, body);
      return sendJson(res, 200, result);
    }

    // 108. POST /api/v1/grievances/:id/reject
    if (method === 'POST' && grvRejectMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvRejectMatch[1];
      const body = await readJsonBody(req);
      const result = await rejectGrievance(user, id, body);
      return sendJson(res, 200, result);
    }

    // 109. POST /api/v1/grievances/:id/close
    if (method === 'POST' && grvCloseMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvCloseMatch[1];
      const body = await readJsonBody(req);
      const result = await closeGrievance(user, id, body);
      return sendJson(res, 200, result);
    }

    // 110. GET /api/v1/grievances/:id/timeline
    if (method === 'GET' && grvTimelineMatch) {
      const { user } = authenticateToken(req.headers.authorization);
      const id = grvTimelineMatch[1];
      const result = getGrievanceTimeline(user, id);
      return sendJson(res, 200, result);
    }

    // 111. POST /api/v1/feedback
    if (method === 'POST' && pathname === '/api/v1/feedback') {
      const { user } = authenticateToken(req.headers.authorization);
      const body = await readJsonBody(req);
      const result = submitFeedback(user, body);
      return sendJson(res, 201, result);
    }

    // 112. GET /api/v1/feedback
    if (method === 'GET' && pathname === '/api/v1/feedback') {
      const { user } = authenticateToken(req.headers.authorization);
      const filters = {
        serviceId: url.searchParams.get('serviceId'),
        applicationId: url.searchParams.get('applicationId'),
        limit: url.searchParams.get('limit')
      };
      const result = listFeedback(user, filters);
      return sendJson(res, 200, result);
    }

    // ==========================================
    // PHASE 20 — ADMIN DASHBOARD & ANALYTICS ENDPOINTS
    // ==========================================

    // 113. GET /api/v1/admin/dashboard
    if (method === 'GET' && pathname === '/api/v1/admin/dashboard') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getAdminOverview(user);
      return sendJson(res, 200, result);
    }

    // 114. GET /api/v1/admin/applications/analytics
    if (method === 'GET' && pathname === '/api/v1/admin/applications/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const filters = {
        departmentId: url.searchParams.get('departmentId'),
        status: url.searchParams.get('status'),
        search: url.searchParams.get('search'),
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset')
      };
      const result = getApplicationAnalytics(user, filters);
      return sendJson(res, 200, result);
    }

    // 115. GET /api/v1/admin/departments/analytics
    if (method === 'GET' && pathname === '/api/v1/admin/departments/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getDepartmentAnalytics(user);
      return sendJson(res, 200, result);
    }

    // 116. GET /api/v1/admin/officers/analytics
    if (method === 'GET' && pathname === '/api/v1/admin/officers/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getOfficerAnalytics(user);
      return sendJson(res, 200, result);
    }

    // 117. GET /api/v1/admin/services/analytics
    if (method === 'GET' && pathname === '/api/v1/admin/services/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getServicePerformance(user);
      return sendJson(res, 200, result);
    }

    // 118. GET /api/v1/admin/workflows/analytics
    if (method === 'GET' && pathname === '/api/v1/admin/workflows/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getWorkflowAnalytics(user);
      return sendJson(res, 200, result);
    }

    // 119. GET /api/v1/admin/exchanges/analytics
    if (method === 'GET' && pathname === '/api/v1/admin/exchanges/analytics') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getExchangeAnalytics(user);
      return sendJson(res, 200, result);
    }

    // 120. GET /api/v1/admin/platform-health
    if (method === 'GET' && pathname === '/api/v1/admin/platform-health') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const result = getPlatformHealth(user);
      return sendJson(res, 200, result);
    }

    // 121. GET /api/v1/admin/export
    if (method === 'GET' && pathname === '/api/v1/admin/export') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const reportType = url.searchParams.get('type') || 'SUMMARY';
      const format = url.searchParams.get('format') || 'json';
      const result = exportAdminReport(user, reportType, format);
      return sendJson(res, 200, result);
    }

    // 122. GET /api/v1/admin/audit-logs (Platform Audit Trail)
    if (method === 'GET' && pathname === '/api/v1/admin/audit-logs') {
      const { user } = authenticateToken(req.headers.authorization);
      requireRole(user, ['ADMIN']);
      const filters = {
        eventType: url.searchParams.get('eventType'),
        actorId: url.searchParams.get('actorId'),
        limit: url.searchParams.get('limit')
      };
      const logs = getAuditEvents(filters);
      return sendJson(res, 200, {
        success: true,
        count: logs.length,
        logs
      });
    }

    // Unmatched API endpoint
    return sendJson(res, 404, { success: false, error: 'API endpoint not found' });

  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    return sendJson(res, statusCode, { success: false, error: message });
  }
}
