/**
-- =============================================================================
-- SIH Unified Government Service Integration Platform — PostgreSQL Driver & Pool
-- Manages connection pooling, transactions, query execution, and migration execution.
-- =============================================================================
*/

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PostgresManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.lastError = null;
    this.initialized = false;
  }

  /**
   * Check if a PostgreSQL database URL is supplied in the environment.
   */
  isConfigured() {
    const dbUrl = (process.env.DATABASE_URL || '').trim();
    return dbUrl.length > 0 && !dbUrl.startsWith('mock:');
  }

  /**
   * Initialize or retrieve the active connection pool.
   */
  getPool() {
    if (this.pool) return this.pool;

    if (!this.isConfigured()) {
      return null;
    }

    const connectionString = process.env.DATABASE_URL;
    const isSslRequired = process.env.PG_SSL === 'true' || 
      connectionString.includes('sslmode=require') || 
      connectionString.includes('.neon.tech') || 
      connectionString.includes('.supabase.co');

    const poolConfig = {
      connectionString,
      max: parseInt(process.env.PG_MAX_CONNECTIONS || '10', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10)
    };

    if (isSslRequired) {
      poolConfig.ssl = {
        rejectUnauthorized: false
      };
    }

    this.pool = new Pool(poolConfig);

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected client error on idle client:', err.message);
      this.lastError = err.message;
      this.isConnected = false;
    });

    return this.pool;
  }

  /**
   * Execute a parameterized SQL query.
   */
  async query(text, params = []) {
    const pool = this.getPool();
    if (!pool) {
      throw new Error('PostgreSQL is not configured. DATABASE_URL is required.');
    }

    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 200) {
        console.warn(`[PostgreSQL Slow Query] ${duration}ms: ${text.slice(0, 100)}`);
      }
      this.isConnected = true;
      return res;
    } catch (err) {
      this.lastError = err.message;
      throw err;
    }
  }

  /**
   * Check health and connectivity to the database.
   */
  async checkHealth() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        message: 'DATABASE_URL not set. Running in in-memory fallback mode.'
      };
    }

    try {
      const res = await this.query('SELECT NOW() as now, version() as version');
      this.isConnected = true;
      return {
        configured: true,
        connected: true,
        timestamp: res.rows[0].now,
        version: res.rows[0].version,
        message: 'PostgreSQL connection active and healthy.'
      };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return {
        configured: true,
        connected: false,
        error: err.message,
        message: 'Configured but unable to connect.'
      };
    }
  }

  /**
   * Execute the schema DDL file to create or verify tables.
   */
  async initSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const ddl = fs.readFileSync(schemaPath, 'utf8');
    const pool = this.getPool();
    if (!pool) {
      throw new Error('Cannot run schema migration: PostgreSQL not configured.');
    }

    const client = await pool.connect();
    try {
      await client.query(ddl);
      this.initialized = true;
      return { success: true, message: 'Schema applied successfully' };
    } finally {
      client.release();
    }
  }

  /**
   * Execute the seed SQL file to populate default platform records.
   */
  async seedDatabase() {
    const seedPath = path.join(__dirname, 'seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');
    const pool = this.getPool();
    if (!pool) {
      throw new Error('Cannot seed database: PostgreSQL not configured.');
    }

    const client = await pool.connect();
    try {
      await client.query(sql);
      return { success: true, message: 'Seed data populated successfully' };
    } finally {
      client.release();
    }
  }

  /**
   * Gracefully close pool connections.
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }
}

export const postgres = new PostgresManager();
