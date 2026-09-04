/**
 * Database Seed Data Runner
 * Usage: node scripts/seed-postgres.js
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
  console.log(' SIH Platform — PostgreSQL Seed Data Runner');
  console.log('===========================================================');

  if (!postgres.isConfigured()) {
    console.warn('\n[!] WARNING: DATABASE_URL is not set in environment or .env');
    console.warn('    Please configure DATABASE_URL to target your PostgreSQL instance.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...');
  const health = await postgres.checkHealth();
  if (!health.connected) {
    console.error(`\n[X] Connection failed: ${health.error}`);
    process.exit(1);
  }

  console.log(`[✓] Connected to PostgreSQL.`);
  console.log('Applying server/database/seed.sql...');

  try {
    await postgres.seedDatabase();
    console.log('[✓] Seed data applied successfully!\n');

    // Count rows across key tables
    const userCount = await postgres.query('SELECT COUNT(*)::int as c FROM users');
    const deptCount = await postgres.query('SELECT COUNT(*)::int as c FROM departments');
    const srvCount = await postgres.query('SELECT COUNT(*)::int as c FROM services');
    const appCount = await postgres.query('SELECT COUNT(*)::int as c FROM applications');
    const docCount = await postgres.query('SELECT COUNT(*)::int as c FROM vault_documents');

    console.log('Current Record Counts:');
    console.log(`  • Users:        ${userCount.rows[0].c}`);
    console.log(`  • Departments:  ${deptCount.rows[0].c}`);
    console.log(`  • Services:     ${srvCount.rows[0].c}`);
    console.log(`  • Applications: ${appCount.rows[0].c}`);
    console.log(`  • Documents:    ${docCount.rows[0].c}`);

    console.log('\nSeeding complete.');
  } catch (err) {
    console.error('[X] Seeding error:', err.message);
    process.exit(1);
  } finally {
    await postgres.disconnect();
  }
}

main();
