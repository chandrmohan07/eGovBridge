/**
 * Database Schema Migration Runner
 * Usage: node scripts/migrate-postgres.js
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
  console.log(' SIH Platform — PostgreSQL Migration Runner');
  console.log('===========================================================');

  if (!postgres.isConfigured()) {
    console.warn('\n[!] WARNING: DATABASE_URL is not set in environment or .env');
    console.warn('    Please configure DATABASE_URL to target your PostgreSQL instance.');
    console.warn('    Example: postgresql://postgres:postgres@localhost:5432/egov_bridge');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...');
  const health = await postgres.checkHealth();
  if (!health.connected) {
    console.error(`\n[X] Connection failed: ${health.error}`);
    process.exit(1);
  }

  console.log(`[✓] Connected to: ${health.version.split(',')[0]}`);
  console.log('Applying server/database/schema.sql...');

  try {
    await postgres.initSchema();
    console.log('[✓] Schema applied successfully!\n');

    // List all tables created
    const tables = await postgres.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`Tables in database (${tables.rows.length}):`);
    tables.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('[X] Migration error:', err.message);
    process.exit(1);
  } finally {
    await postgres.disconnect();
  }
}

main();
