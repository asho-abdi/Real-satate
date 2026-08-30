import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

/**
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
function required(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    if (fallback !== undefined && !isProduction) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return raw;
}

/**
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function optional(key, fallback) {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

/**
 * @param {string} key
 * @param {number} fallback
 * @returns {number}
 */
function int(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Environment variable ${key} must be an integer`);
  }
  return n;
}

/**
 * @param {string} key
 * @param {boolean} fallback
 * @returns {boolean}
 */
function bool(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

const WEAK_JWT_PATTERNS = [
  'change-me',
  'dev-access-secret',
  'dev-refresh-secret',
  'your-secret',
  'replace-me',
];

/**
 * @param {string} key
 * @param {string} value
 */
function assertStrongJwtSecret(key, value) {
  if (value.length < 32) {
    throw new Error(`${key} must be at least 32 characters in production`);
  }
  const lower = value.toLowerCase();
  if (WEAK_JWT_PATTERNS.some((pattern) => lower.includes(pattern))) {
    throw new Error(`${key} must not use a placeholder or default value in production`);
  }
}

if (isProduction) {
  required('DATABASE_URL');
  required('JWT_ACCESS_SECRET');
  required('JWT_REFRESH_SECRET');
  required('FRONTEND_URL');
}

const env = Object.freeze({
  NODE_ENV,
  isProduction,
  isDevelopment: NODE_ENV === 'development',

  PORT: int('PORT', 5000),
  APP_NAME: optional('APP_NAME', 'EstateOps API'),
  APP_URL: optional('APP_URL', 'http://localhost:5000'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),
  API_PREFIX: optional('API_PREFIX', '/api/v1'),

  DATABASE_URL: required(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/estateops?schema=public',
  ),

  JWT_ACCESS_SECRET: required(
    'JWT_ACCESS_SECRET',
    'dev-access-secret-change-me-min-32-chars!!',
  ),
  JWT_REFRESH_SECRET: required(
    'JWT_REFRESH_SECRET',
    'dev-refresh-secret-change-me-min-32-chars!',
  ),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  BCRYPT_SALT_ROUNDS: int('BCRYPT_SALT_ROUNDS', 12),

  RATE_LIMIT_WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  RATE_LIMIT_MAX: int('RATE_LIMIT_MAX', 200),

  UPLOAD_DIR: optional('UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: int('MAX_FILE_SIZE_MB', 10),
  MAX_FILE_SIZE_BYTES: int('MAX_FILE_SIZE_MB', 10) * 1024 * 1024,

  SMTP_HOST: optional('SMTP_HOST', ''),
  SMTP_PORT: int('SMTP_PORT', 587),
  SMTP_SECURE: bool('SMTP_SECURE', false),
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  SMTP_FROM: optional('SMTP_FROM', 'EstateOps <noreply@estateops.local>'),
  hasSmtp: Boolean(optional('SMTP_HOST', '') && optional('SMTP_USER', '')),
});

if (isProduction) {
  assertStrongJwtSecret('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET);
  assertStrongJwtSecret('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET);
}

export default env;
export { env };
