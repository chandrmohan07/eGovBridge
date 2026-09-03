/**
 * SIH Government Service Integration Platform — Production Build & Readiness Verifier
 * Verifies that all production assets, configuration registries, environment templates,
 * and canonical schemas are intact and valid before deployment.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== SIH PLATFORM PRODUCTION BUILD & READINESS CHECK ===\n');

let hasError = false;

// 1. Verify Core Directory Structure
const requiredDirs = ['config', 'docs', 'public', 'server', 'scripts', 'tests'];
for (const dir of requiredDirs) {
  const dirPath = path.join(rootDir, dir);
  if (!fs.existsSync(dirPath)) {
    console.error(`[FAIL] Required directory missing: ${dir}`);
    hasError = true;
  } else {
    console.log(`[PASS] Directory exists: ${dir}`);
  }
}

// 2. Verify Critical Configuration Registries
const jsonRegistries = [
  'config/external-apis.json',
  'config/external-urls.json',
  'config/document-types.json',
  'config/notification-types.json',
  'config/data-models/canonical-schemas.json'
];

for (const reg of jsonRegistries) {
  const fullPath = path.join(rootDir, reg);
  if (!fs.existsSync(fullPath)) {
    console.error(`[FAIL] Configuration registry missing: ${reg}`);
    hasError = true;
  } else {
    try {
      JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log(`[PASS] JSON configuration valid: ${reg}`);
    } catch (e) {
      console.error(`[FAIL] Malformed JSON in: ${reg} - ${e.message}`);
      hasError = true;
    }
  }
}

// 3. Verify Environment Template & .gitignore Security
const envExample = path.join(rootDir, '.env.example');
const gitignore = path.join(rootDir, '.gitignore');

if (!fs.existsSync(envExample)) {
  console.error('[FAIL] .env.example template missing');
  hasError = true;
} else {
  console.log('[PASS] .env.example template present');
}

if (!fs.existsSync(gitignore)) {
  console.error('[FAIL] .gitignore missing');
  hasError = true;
} else {
  const gitignoreContent = fs.readFileSync(gitignore, 'utf8');
  if (!gitignoreContent.includes('.env')) {
    console.error('[FAIL] .gitignore does not ignore .env');
    hasError = true;
  } else {
    console.log('[PASS] .gitignore protects .env and secrets');
  }
}

// 4. Verify Static Frontend Assets
const frontendAssets = [
  'public/index.html',
  'public/css/variables.css',
  'public/css/base.css',
  'public/css/layout.css',
  'public/css/components.css',
  'public/js/app.js',
  'public/js/store.js'
];

for (const asset of frontendAssets) {
  const assetPath = path.join(rootDir, asset);
  if (!fs.existsSync(assetPath)) {
    console.error(`[FAIL] Frontend asset missing: ${asset}`);
    hasError = true;
  } else {
    console.log(`[PASS] Frontend asset present: ${asset}`);
  }
}

// 5. Verify Zero Hardcoded Secrets in Config Files
const secretPatterns = [
  /BEGIN RSA PRIVATE KEY/,
  /BEGIN PRIVATE KEY/,
  /AKIA[0-9A-Z]{16}/
];

for (const reg of jsonRegistries) {
  const content = fs.readFileSync(path.join(rootDir, reg), 'utf8');
  for (const pat of secretPatterns) {
    if (pat.test(content)) {
      console.error(`[FAIL] Potential hardcoded secret pattern detected in: ${reg}`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('\n[BUILD FAILED] One or more production readiness checks failed.');
  process.exit(1);
} else {
  console.log('\n[BUILD SUCCESS] Platform is fully verified and ready for production deployment.\n');
  process.exit(0);
}
