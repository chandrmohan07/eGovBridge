import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Phase 1 — Project Foundation & Configuration Verification', () => {

  it('PLAN.md should exist and serve as single source of truth', () => {
    const planPath = path.join(rootDir, 'PLAN.md');
    assert.ok(fs.existsSync(planPath), 'PLAN.md does not exist at project root');
    const content = fs.readFileSync(planPath, 'utf8');
    assert.ok(content.length > 5000, 'PLAN.md appears too short or corrupted');
    assert.ok(content.includes('PHASE 1 — Repository Audit & Project Foundation'), 'PLAN.md missing Phase 1 section');
  });

  it('.gitignore should exist and protect .env and dependencies', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore does not exist');
    const content = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(content.includes('.env'), '.gitignore must ignore .env files');
    assert.ok(content.includes('node_modules'), '.gitignore must ignore node_modules');
  });

  it('.env.example should exist and define safe placeholders for all configured APIs', () => {
    const envExamplePath = path.join(rootDir, '.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example does not exist');
    const content = fs.readFileSync(envExamplePath, 'utf8');
    
    // Read external-apis.json to verify every required env var is defined
    const apisConfigPath = path.join(rootDir, 'config', 'external-apis.json');
    const apisData = JSON.parse(fs.readFileSync(apisConfigPath, 'utf8'));

    const checkEnvVar = (envVarName) => {
      if (!envVarName) return;
      assert.ok(
        content.includes(`${envVarName}=`),
        `.env.example is missing placeholder for referenced variable: ${envVarName}`
      );
    };

    // Check government systems
    for (const [key, system] of Object.entries(apisData.governmentSystems)) {
      checkEnvVar(system.envVarName);
      if (system.authEnvVarName) {
        checkEnvVar(system.authEnvVarName);
      }
    }

    // Check chatbot
    if (apisData.chatbot) {
      checkEnvVar(apisData.chatbot.envVarName);
      if (apisData.chatbot.authEnvVarName) {
        checkEnvVar(apisData.chatbot.authEnvVarName);
      }
    }
  });

  it('config/external-apis.json should be valid JSON and satisfy PLAN.md schema requirements', () => {
    const configPath = path.join(rootDir, 'config', 'external-apis.json');
    assert.ok(fs.existsSync(configPath), 'config/external-apis.json does not exist');
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(config.governmentSystems, 'Missing governmentSystems key in external-apis.json');
    assert.ok(config.chatbot, 'Missing chatbot key in external-apis.json');

    // Required fields per PLAN.md lines 202-215
    const requiredFields = [
      'name',
      'purpose',
      'baseUrl',
      'endpoints',
      'authMethod',
      'envVarName',
      'requestMethod',
      'responseFormat',
      'owner',
      'enabled',
      'lastVerifiedDate'
    ];

    for (const [systemKey, system] of Object.entries(config.governmentSystems)) {
      for (const field of requiredFields) {
        assert.ok(
          system[field] !== undefined,
          `Government system '${systemKey}' in external-apis.json is missing required field: '${field}'`
        );
      }
    }
  });

  it('config/external-urls.json should be valid JSON and contain all required official sources', () => {
    const urlsPath = path.join(rootDir, 'config', 'external-urls.json');
    assert.ok(fs.existsSync(urlsPath), 'config/external-urls.json does not exist');
    
    const urlsConfig = JSON.parse(fs.readFileSync(urlsPath, 'utf8'));
    assert.ok(urlsConfig.officialSources, 'Missing officialSources in external-urls.json');

    const expectedSources = ['scholarships', 'governmentSchemes', 'employment', 'announcements'];
    for (const source of expectedSources) {
      assert.ok(
        urlsConfig.officialSources[source],
        `external-urls.json is missing expected source: '${source}'`
      );
      assert.ok(
        urlsConfig.officialSources[source].url,
        `official source '${source}' must define a URL`
      );
    }
  });

  it('config/README.md should document all registered APIs and URLs in tabular format', () => {
    const readmePath = path.join(rootDir, 'config', 'README.md');
    assert.ok(fs.existsSync(readmePath), 'config/README.md does not exist');
    const content = fs.readFileSync(readmePath, 'utf8');
    assert.ok(content.includes('External API & URL Registry'), 'Registry header missing');
    assert.ok(content.includes('EDUCATION_API_URL'), 'Registry missing education API documentation');
    assert.ok(content.includes('https://scholarships.gov.in'), 'Registry missing official scholarship source');
  });

  it('docs/ directory should contain audit and development rules', () => {
    assert.ok(fs.existsSync(path.join(rootDir, 'docs', 'AUDIT.md')), 'docs/AUDIT.md does not exist');
    assert.ok(fs.existsSync(path.join(rootDir, 'docs', 'DEVELOPMENT_RULES.md')), 'docs/DEVELOPMENT_RULES.md does not exist');
  });
});
