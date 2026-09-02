import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { hashPassword, verifyPassword, db, ROLES } from '../server/db.js';
import { register, login, logout, authenticateToken, requireRole, requireDepartmentScope, sanitizeUser } from '../server/auth.js';

describe('Phase 3 — Authentication & Role Management (RBAC) Verification', () => {

  // 1. Password Hashing & Security Verification
  describe('Cryptographic Security & Password Handling', () => {
    it('passwords must be securely hashed with salt and never stored in plaintext', () => {
      const plainPassword = 'SecureCitizenPass@2026';
      const { hash, salt } = hashPassword(plainPassword);

      assert.notEqual(hash, plainPassword, 'Password must not match plaintext');
      assert.ok(hash.length >= 64, 'Hash must be a secure cryptographic length');
      assert.ok(salt.length >= 16, 'Salt must be random and secure');
      assert.ok(verifyPassword(plainPassword, hash, salt), 'Password verification must succeed for valid password');
      assert.ok(!verifyPassword('WrongPassword', hash, salt), 'Password verification must fail for invalid password');
    });

    it('sanitizeUser must strictly strip passwordHash and salt', () => {
      const rawUser = db.findUserByEmail('citizen@example.com');
      assert.ok(rawUser.passwordHash, 'Raw user contains passwordHash');
      assert.ok(rawUser.salt, 'Raw user contains salt');

      const sanitized = sanitizeUser(rawUser);
      assert.equal(sanitized.passwordHash, undefined, 'Sanitized user must NOT contain passwordHash');
      assert.equal(sanitized.salt, undefined, 'Sanitized user must NOT contain salt');
      assert.ok(sanitized.permissions && sanitized.permissions.length > 0, 'Sanitized user must contain permissions');
    });
  });

  // 2. Citizen Flow & Route Protection
  describe('Citizen Authentication & RBAC Boundary', () => {
    it('citizen registration should create account and issue valid session token', () => {
      const testEmail = `newcitizen_${Date.now()}@example.com`;
      const result = register({
        name: 'Aakash Verma',
        email: testEmail,
        password: 'Password@123',
        phone: '+91 99887 76655',
        state: 'Karnataka',
        district: 'Bengaluru'
      });

      assert.ok(result.token.startsWith('sih_sess_'), 'Must return secure session token');
      assert.equal(result.user.email, testEmail);
      assert.equal(result.user.role, 'CITIZEN');
      assert.equal(result.user.passwordHash, undefined, 'Must not leak hash');
    });

    it('citizen login should succeed with correct credentials and fail with invalid', () => {
      const loginSuccess = login({ email: 'citizen@example.com', password: 'Citizen@123' });
      assert.ok(loginSuccess.token, 'Token returned on successful login');
      assert.equal(loginSuccess.user.role, 'CITIZEN');

      assert.throws(() => {
        login({ email: 'citizen@example.com', password: 'WrongPassword@123' });
      }, /Invalid email or password/);

      assert.throws(() => {
        login({ email: 'nonexistent@example.com', password: 'Password@123' });
      }, /Invalid email or password/);
    });

    it('citizen session should allow citizen access but strictly BLOCK officer and admin access', () => {
      const session = login({ email: 'citizen@example.com', password: 'Citizen@123' });
      const auth = authenticateToken(session.token);

      // Citizen can access citizen role
      assert.doesNotThrow(() => requireRole(auth.user, ['CITIZEN']));

      // Citizen CANNOT access Officer role (throws 403)
      assert.throws(() => {
        requireRole(auth.user, ['OFFICER']);
      }, /Access Denied: Role 'CITIZEN' is not authorized/);

      // Citizen CANNOT access Admin role (throws 403)
      assert.throws(() => {
        requireRole(auth.user, ['ADMIN']);
      }, /Access Denied: Role 'CITIZEN' is not authorized/);
    });
  });

  // 3. Department Officer Flow & Department Isolation
  describe('Department Officer Authentication & Department Isolation', () => {
    it('education officer login should be scoped strictly to EDUCATION department', () => {
      const eduSession = login({ email: 'officer.edu@gov.in', password: 'Officer@123' });
      const auth = authenticateToken(eduSession.token);

      assert.equal(auth.user.role, 'OFFICER');
      assert.equal(auth.user.departmentCode, 'EDUCATION');

      // Education officer can access EDUCATION data
      assert.doesNotThrow(() => requireDepartmentScope(auth.user, 'EDUCATION'));

      // Education officer CANNOT access REVENUE data (department isolation)
      assert.throws(() => {
        requireDepartmentScope(auth.user, 'REVENUE');
      }, /cannot access data for department: REVENUE/);

      // Officer CANNOT access Admin functionality
      assert.throws(() => {
        requireRole(auth.user, ['ADMIN']);
      }, /Access Denied: Role 'OFFICER' is not authorized/);
    });

    it('revenue officer login should be scoped strictly to REVENUE department', () => {
      const revSession = login({ email: 'officer.rev@gov.in', password: 'Officer@123' });
      const auth = authenticateToken(revSession.token);

      assert.equal(auth.user.departmentCode, 'REVENUE');
      assert.doesNotThrow(() => requireDepartmentScope(auth.user, 'REVENUE'));

      assert.throws(() => {
        requireDepartmentScope(auth.user, 'EDUCATION');
      }, /cannot access data for department: EDUCATION/);
    });
  });

  // 4. Admin Flow
  describe('Platform Administrator Authentication & System Management', () => {
    it('admin login should grant administrator role and access to admin resources', () => {
      const adminSession = login({ email: 'admin@gov.in', password: 'Admin@123' });
      const auth = authenticateToken(adminSession.token);

      assert.equal(auth.user.role, 'ADMIN');
      assert.doesNotThrow(() => requireRole(auth.user, ['ADMIN']));

      const usersList = db.getAllUsersSafe();
      assert.ok(usersList.length >= 4, 'Admin can view all users');

      const depts = db.getAllDepartments();
      assert.ok(depts.length >= 5, 'Admin can view departments');
    });
  });

  // 5. Session Revocation (Logout) & Expiration
  describe('Session Lifecycle & Logout', () => {
    it('logout must invalidate token and reject subsequent requests', () => {
      const session = login({ email: 'citizen@example.com', password: 'Citizen@123' });
      const validAuth = authenticateToken(session.token);
      assert.ok(validAuth.user, 'User verified before logout');

      logout(session.token);

      assert.throws(() => {
        authenticateToken(session.token);
      }, /Invalid or expired authentication session/);
    });
  });

  // 6. Live HTTP API Integration Tests (Protected Endpoints)
  describe('Live HTTP API Server & Route Guards', () => {
    let server;
    let port;

    const makeRequest = (method, pathUrl, body = null, token = null) => {
      return new Promise((resolve, reject) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: pathUrl,
          method,
          headers
        }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ statusCode: res.statusCode, raw: data });
            }
          });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    };

    it('should start server and run end-to-end HTTP Auth & RBAC checks', async () => {
      server = createServer();
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      port = server.address().port;

      try {
        // 1. Test POST /api/v1/auth/login with valid citizen credentials
        const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
          email: 'citizen@example.com',
          password: 'Citizen@123'
        });
        assert.equal(loginRes.statusCode, 200);
        assert.ok(loginRes.data.token);
        assert.equal(loginRes.data.user.role, 'CITIZEN');
        const citizenToken = loginRes.data.token;

        // 2. Test GET /api/v1/auth/me with Citizen Token
        const meRes = await makeRequest('GET', '/api/v1/auth/me', null, citizenToken);
        assert.equal(meRes.statusCode, 200);
        assert.equal(meRes.data.user.email, 'citizen@example.com');

        // 3. Test Unauthorized Access without Token -> 401
        const unauthRes = await makeRequest('GET', '/api/v1/officer/workspace');
        assert.equal(unauthRes.statusCode, 401);

        // 4. Test Citizen attempting Officer route -> 403 Forbidden
        const citizenAccessOfficer = await makeRequest('GET', '/api/v1/officer/workspace', null, citizenToken);
        assert.equal(citizenAccessOfficer.statusCode, 403);
        assert.ok(citizenAccessOfficer.data.error.includes('Access Denied'));

        // 5. Test Citizen attempting Admin route -> 403 Forbidden
        const citizenAccessAdmin = await makeRequest('GET', '/api/v1/admin/users', null, citizenToken);
        assert.equal(citizenAccessAdmin.statusCode, 403);

        // 6. Test Officer Login (Education)
        const eduLogin = await makeRequest('POST', '/api/v1/auth/login', {
          email: 'officer.edu@gov.in',
          password: 'Officer@123'
        });
        assert.equal(eduLogin.statusCode, 200);
        const eduToken = eduLogin.data.token;

        // 7. Test Officer accessing own department workspace -> 200 OK
        const eduWorkspace = await makeRequest('GET', '/api/v1/officer/workspace', null, eduToken);
        assert.equal(eduWorkspace.statusCode, 200);
        assert.equal(eduWorkspace.data.departmentCode, 'EDUCATION');
        assert.ok(eduWorkspace.data.applications.length > 0);

        // 8. Test Education Officer accessing REVENUE department -> 403 Forbidden
        const eduAccessRev = await makeRequest('GET', '/api/v1/officer/department/REVENUE/applications', null, eduToken);
        assert.equal(eduAccessRev.statusCode, 403);

        // 9. Test Admin Login
        const adminLogin = await makeRequest('POST', '/api/v1/auth/login', {
          email: 'admin@gov.in',
          password: 'Admin@123'
        });
        assert.equal(adminLogin.statusCode, 200);
        const adminToken = adminLogin.data.token;

        // 10. Test Admin accessing users & departments -> 200 OK
        const adminUsers = await makeRequest('GET', '/api/v1/admin/users', null, adminToken);
        assert.equal(adminUsers.statusCode, 200);
        assert.ok(adminUsers.data.users.length >= 4);

        const adminDepts = await makeRequest('GET', '/api/v1/admin/departments', null, adminToken);
        assert.equal(adminDepts.statusCode, 200);
        assert.ok(adminDepts.data.departments.length >= 5);

        // 11. Test POST /api/v1/auth/logout
        const logoutRes = await makeRequest('POST', '/api/v1/auth/logout', null, citizenToken);
        assert.equal(logoutRes.statusCode, 200);

        // Subsequent call with logged-out token -> 401
        const postLogoutMe = await makeRequest('GET', '/api/v1/auth/me', null, citizenToken);
        assert.equal(postLogoutMe.statusCode, 401);

      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    });
  });
});
