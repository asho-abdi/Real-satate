/**
 * Lightweight production env checklist (does not print secret values).
 *   node scripts/check-prod-env.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'backend', '.env');

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.error('Missing backend/.env — copy backend/.env.production.example first.');
  process.exit(1);
}

const env = { ...loadEnvFile(envPath), ...process.env };

const required = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'APP_URL',
];

const weak = [
  'change-me',
  'dev-access',
  'dev-refresh',
  'your-secret',
  'replace-me',
  'postgres:postgres',
];
let failed = 0;

for (const key of required) {
  const value = env[key];
  if (!value) {
    console.error(`✗ Missing ${key}`);
    failed += 1;
    continue;
  }
  if (key.includes('SECRET') && value.length < 32) {
    console.error(`✗ ${key} must be at least 32 characters`);
    failed += 1;
    continue;
  }
  if (weak.some((w) => value.toLowerCase().includes(w))) {
    console.error(`✗ ${key} still looks like a placeholder / weak value`);
    failed += 1;
    continue;
  }
  console.log(`✓ ${key}`);
}

if (env.NODE_ENV !== 'production') {
  console.warn('! NODE_ENV is not "production" (set it for the live server)');
}

const fe = path.join(root, 'frontend', '.env.production');
if (!fs.existsSync(fe)) {
  console.warn('! frontend/.env.production not found — create it before building the UI');
} else {
  console.log('✓ frontend/.env.production exists');
}

if (failed) {
  console.error(`\n${failed} issue(s) found. Fix backend/.env then re-run.`);
  process.exit(1);
}

console.log('\nBackend env looks ready for production.');
