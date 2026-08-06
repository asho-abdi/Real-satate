import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { AppError } from './AppError.js';

/**
 * @param {{ sub: string, email?: string, role?: string }} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * @param {{ sub: string }} payload
 * @returns {string}
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload}
 */
export function verifyAccess(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError('Invalid or expired access token', 401, { code: 'INVALID_ACCESS_TOKEN' });
  }
}

/**
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload}
 */
export function verifyRefresh(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, { code: 'INVALID_REFRESH_TOKEN' });
  }
}

/**
 * Decode JWT expiry to a Date (approximate from signed token).
 * @param {string} token
 * @returns {Date}
 */
export function getTokenExpiry(token) {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string' || !decoded.exp) {
    // Fallback: 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(decoded.exp * 1000);
}

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
  getTokenExpiry,
};
