/**
 * SIH Government Service Integration Platform — Server Authentication & RBAC Engine
 * Provides secure login, registration, token verification, and server-side RBAC guards.
 */

import { db, verifyPassword, ROLES } from './db.js';
import { recordAuditEvent, AUDIT_EVENTS } from './security/index.js';

export class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

/**
 * Remove sensitive password and salt fields before returning user object
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  const roleMeta = ROLES[safeUser.role] || {};
  return {
    ...safeUser,
    roleTitle: roleMeta.name,
    permissions: roleMeta.permissions || []
  };
}

/**
 * Register a new Citizen
 */
export function register({ email, password, name, phone, state, district }) {
  if (!email || !password || !name) {
    throw new AuthError('Email, password, and full name are required', 400);
  }

  if (password.length < 8) {
    throw new AuthError('Password must be at least 8 characters long', 400);
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    throw new AuthError('An account with this email address already exists', 409);
  }

  const newUser = db.createUser({ email, password, name, phone, state, district });
  const session = db.createSession(newUser);

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: sanitizeUser(newUser)
  };
}

/**
 * Authenticate existing user with email and password
 */
export function login({ email, password }) {
  if (!email || !password) {
    recordAuditEvent(AUDIT_EVENTS.LOGIN_FAILED, null, { email: email || 'MISSING', reason: 'MISSING_FIELDS' });
    throw new AuthError('Email and password are required', 400);
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    recordAuditEvent(AUDIT_EVENTS.LOGIN_FAILED, null, { email, reason: 'USER_NOT_FOUND' });
    throw new AuthError('Invalid email or password', 401);
  }

  const valid = verifyPassword(password, user.passwordHash, user.salt);
  if (!valid) {
    recordAuditEvent(AUDIT_EVENTS.LOGIN_FAILED, user, { email, reason: 'INVALID_CREDENTIALS' });
    throw new AuthError('Invalid email or password', 401);
  }

  const session = db.createSession(user);
  recordAuditEvent(AUDIT_EVENTS.LOGIN, user, { email: user.email, role: user.role });

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: sanitizeUser(user)
  };
}

/**
 * Terminate user session
 */
export function logout(token) {
  if (!token) return false;
  recordAuditEvent(AUDIT_EVENTS.LOGOUT, null, { tokenPrefix: token.slice(0, 8) });
  return db.deleteSession(token);
}

/**
 * Extract and verify user from Bearer session token
 */
export function authenticateToken(token) {
  if (!token) {
    throw new AuthError('Authentication token missing', 401);
  }

  const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  const session = db.getSession(cleanToken);

  if (!session) {
    throw new AuthError('Invalid or expired authentication session', 401);
  }

  const user = db.findUserById(session.userId);
  if (!user) {
    throw new AuthError('User account not found', 401);
  }

  return {
    session,
    user: sanitizeUser(user)
  };
}

/**
 * Server-Side RBAC Guard
 * Ensures user has one of the required roles
 */
export function requireRole(user, allowedRoles) {
  if (!user || !user.role) {
    recordAuditEvent(AUDIT_EVENTS.ACCESS_DENIED, null, { reason: 'NO_ACTIVE_SESSION' });
    throw new AuthError('Unauthorized: No active user session', 401);
  }

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!rolesArray.includes(user.role)) {
    recordAuditEvent(AUDIT_EVENTS.ACCESS_DENIED, user, {
      attemptedRole: user.role,
      requiredRoles: rolesArray
    });
    throw new AuthError(
      `Access Denied: Role '${user.role}' is not authorized to access this resource. Required: ${rolesArray.join(', ')}`,
      403
    );
  }

  return true;
}

/**
 * Server-Side Department-Scope Guard
 * Ensures an officer can ONLY access data belonging to their assigned department
 */
export function requireDepartmentScope(user, departmentCode) {
  requireRole(user, ['OFFICER']);

  if (user.departmentCode !== departmentCode) {
    recordAuditEvent(AUDIT_EVENTS.ACCESS_DENIED, user, {
      officerDepartment: user.departmentCode,
      requiredDepartment: departmentCode
    });
    throw new AuthError(
      `Access Denied: Officer is assigned to ${user.departmentCode} and cannot access data for department: ${departmentCode}`,
      403
    );
  }

  return true;
}
