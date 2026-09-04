/**
 * PostgreSQL Status & Diagnostic Tool
 * Usage: node scripts/db-status.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

import { postgres } from '../server/database/postgres.js';

async function main() {
  console.log('===========================================================');
  console.log(' SIH Platform — PostgreSQL Diagnostic & Health Checker');
  console.log('===========================================================');

  if (!postgres.isConfigured()) {
    console.log('[MODE] Running in: In-Memory Simulated Database (DATABASE_URL not set)');
    console.log('[INFO] To switch to PostgreSQL:');
    console.log('       1. Copy .env.example to .env');
    console.log('       2. Set DATABASE_URL=postgresql://user:password@host:5432/dbname');
    console.log('       3. Run: npm run db:migrate && npm run db:seed');
    process.exit(0);
  }

  const start = Date.now();
  const health = await postgres.checkHealth();
  const latency = Date.now() - start;

  if (!health.connected) {
    console.error(`[STATUS] DISCONNECTED (Latency: ${latency}ms)`);
    console.error(`[ERROR]  ${health.error}`);
    process.exit(1);
  }

  console.log(`[STATUS]  CONNECTED (Latency: ${latency}ms)`);
  console.log(`[ENGINE]  ${health.version.split(',')[0]}`);
  console.log(`[TIME]    ${health.timestamp}\n`);

  try {
    const tableQueries = [
      { name: 'departments', label: 'Departments' },
      { name: 'users', label: 'Users' },
      { name: 'sessions', label: 'Active Sessions' },
      { name: 'services', label: 'Services Catalog' },
      { name: 'applications', label: 'Applications' },
      { name: 'orchestrations', label: 'Orchestrations' },
      { name: 'vault_documents', label: 'Vault Documents' },
      { name: 'notifications', label: 'Notifications' },
      { name: 'grievances', label: 'Grievances' },
      { name: 'feedbacks', label: 'Feedbacks' },
      { name: 'system_audit_logs', label: 'System Audit Logs' }
    ];

    console.log('Table Inventory:');
    for (const t of tableQueries) {
      try {
        const res = await postgres.query(`SELECT COUNT(*)::int as c FROM ${t.name}`);
        console.log(`  • ${t.label.padEnd(22)}: ${res.rows[0].c} records`);
      } catch (tableErr) {
        console.log(`  • ${t.label.padEnd(22)}: [Table Not Created Yet]`);
      }
    }
  } catch (err) {
    console.error('[X] Error querying table stats:', err.message);
  } finally {
    await postgres.disconnect();
  }
}

main();
