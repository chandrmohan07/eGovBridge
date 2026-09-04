import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createServer } from '../scripts/dev-server.js';
import { postgres } from '../server/database/postgres.js';
import { postgresRepository } from '../server/database/postgres-repository.js';
import { db } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PostgreSQL Database Layer & Dual-Mode Integration Tests', () => {

  // 1. DDL Schema & Seed File Integrity
  describe('SQL Schema & Seed Verification', () => {
    it('schema.sql must exist and define all core e-Governance tables', () => {
      const schemaPath = path.resolve(__dirname, '..', 'server', 'database', 'schema.sql');
      assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');

      const ddl = fs.readFileSync(schemaPath, 'utf8');
      const requiredTables = [
        'departments',
        'users',
        'sessions',
        'services',
        'applications',
        'orchestrations',
        'vault_documents',
        'vault_audit_logs',
        'notifications',
        'notification_preferences',
        'grievances',
        'feedbacks',
        'system_audit_logs'
      ];

      for (const table of requiredTables) {
        assert.ok(
          ddl.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
          `schema.sql must define table "${table}"`
        );
      }
    });

    it('schema.sql must specify JSONB columns for extensible canonical payloads', () => {
      const schemaPath = path.resolve(__dirname, '..', 'server', 'database', 'schema.sql');
      const ddl = fs.readFileSync(schemaPath, 'utf8');

      assert.ok(ddl.includes('form_data JSONB'), 'applications must have form_data JSONB');
      assert.ok(ddl.includes('documents JSONB'), 'applications must have documents JSONB');
      assert.ok(ddl.includes('metadata JSONB'), 'vault_documents must have metadata JSONB');
      assert.ok(ddl.includes('timeline JSONB'), 'applications must have timeline JSONB');
    });

    it('seed.sql must exist and contain default platform users and services', () => {
      const seedPath = path.resolve(__dirname, '..', 'server', 'database', 'seed.sql');
      assert.ok(fs.existsSync(seedPath), 'seed.sql must exist');

      const seedSql = fs.readFileSync(seedPath, 'utf8');
      assert.ok(seedSql.includes('citizen@example.com'), 'seed.sql must seed citizen user');
      assert.ok(seedSql.includes('officer.edu@gov.in'), 'seed.sql must seed education officer');
      assert.ok(seedSql.includes('admin@gov.in'), 'seed.sql must seed admin user');
      assert.ok(seedSql.includes('SRV-EDU-001'), 'seed.sql must seed scholarship service');
    });
  });

  // 2. Postgres Manager & Dual-Mode Behavior
  describe('PostgreSQL Manager & Fallback Engine', () => {
    it('isConfigured() returns false when DATABASE_URL is unset', () => {
      const original = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      assert.equal(postgres.isConfigured(), false);
      if (original) process.env.DATABASE_URL = original;
    });

    it('checkHealth() reports fallback mode when unconfigured', async () => {
      const original = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const health = await postgres.checkHealth();
      assert.equal(health.configured, false);
      assert.equal(health.connected, false);
      assert.ok(health.message.includes('in-memory fallback'));

      if (original) process.env.DATABASE_URL = original;
    });

    it('db object exposes PostgreSQL helper methods', () => {
      assert.equal(typeof db.isPostgresConfigured, 'function');
      assert.equal(typeof db.isPostgresConnected, 'function');
      assert.equal(typeof db.initPostgres, 'function');
      assert.equal(typeof db.loadFromPostgres, 'function');
      assert.ok(db.pg, 'db.pg must reference postgres manager');
      assert.ok(db.pgRepository, 'db.pgRepository must reference postgres repository');
    });
  });

  // 3. Repository Method Contract
  describe('PostgreSQL Repository API Contract', () => {
    it('postgresRepository exports required query and mutation methods', () => {
      const requiredMethods = [
        'findUserByEmail',
        'findUserById',
        'getUsersByRole',
        'getAllUsersSafe',
        'createUser',
        'createSession',
        'getSession',
        'deleteSession',
        'getAllDepartments',
        'getAllServices',
        'getServiceById',
        'getDepartmentalApplications',
        'getCitizenApplications',
        'getApplicationById',
        'createApplication',
        'updateApplication',
        'getVaultDocuments',
        'getVaultDocumentById',
        'createVaultDocument',
        'deleteVaultDocument',
        'recordVaultAudit',
        'getNotifications',
        'getUnreadNotificationsCount',
        'markNotificationAsRead',
        'getGrievances',
        'createGrievance',
        'getFeedback',
        'createFeedback'
      ];

      for (const method of requiredMethods) {
        assert.equal(
          typeof postgresRepository[method],
          'function',
          `postgresRepository must export method "${method}"`
        );
      }
    });
  });

  // 4. API Gateway Health Endpoint
  describe('Gateway /api/v1/health Database Diagnostics', () => {
    let server;
    let port;

    it('gateway health endpoint includes database diagnostic status', async () => {
      server = createServer();
      await new Promise((resolve) => {
        server.listen(0, () => {
          port = server.address().port;
          resolve();
        });
      });

      const response = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/v1/health`, (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
        }).on('error', reject);
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.ok(response.body.database, 'Health check must include database object');
      assert.equal(typeof response.body.database.configured, 'boolean');
      assert.equal(typeof response.body.database.connected, 'boolean');
      assert.ok(response.body.database.engine, 'Health check must report database engine');

      await new Promise((resolve) => server.close(resolve));
    });
  });
});
