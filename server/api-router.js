/**
 * SIH Government Service Integration Platform — Authentication & RBAC API Router
 * Handles incoming HTTP REST requests for Auth and Protected Role Routes.
 */

import { register, login, logout, authenticateToken, requireRole, requireDepartmentScope, AuthError } from './auth.js';
import { db } from './db.js';

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

    // Unmatched API endpoint
    return sendJson(res, 404, { success: false, error: 'API endpoint not found' });

  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    return sendJson(res, statusCode, { success: false, error: message });
  }
}
