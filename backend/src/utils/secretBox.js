/**
 * AES-256-GCM encrypt/decrypt for MFA secrets at rest.
 * Key derived from MFA_ENCRYPTION_KEY or JWT_ACCESS_SECRET.
 */
import crypto from 'node:crypto';
import env from '../config/env.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function keyBytes() {
  const material = process.env.MFA_ENCRYPTION_KEY || env.JWT_ACCESS_SECRET || 'dev-insecure-mfa-key';
  return crypto.createHash('sha256').update(String(material)).digest();
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payload) {
  const buf = Buffer.from(String(payload), 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function hashRecoveryCode(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}
