/**
 * SIH Government Service Integration Platform — Authentication & RBAC API Router
 * Handles incoming HTTP REST requests for Auth and Protected Role Routes.
 */

import { register, login, logout, authenticateToken, requireRole, requireDepartmentScope, AuthError } from './auth.js';
import { db } from './db.js';
import { validateApplicationPayload, validateDocument } from './validation.js';
import { stepOrchestration, executeTask, updateTaskDependencies, computeOrchestrationStatus, TASK_STATUS, ORCHESTRATION_STATUS } from './orchestrator.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
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
        applications = db.getCitizenApplications(user.id);
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

      return sendJson(res, 200, {
        success: true,
        application: app
      });
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

    // Unmatched API endpoint
    return sendJson(res, 404, { success: false, error: 'API endpoint not found' });

  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    return sendJson(res, statusCode, { success: false, error: message });
  }
}
