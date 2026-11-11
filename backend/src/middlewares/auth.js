import { verifyAccess } from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { findUserByIdWithRole } from '../repositories/user.repository.js';
import { sanitizeUser } from '../services/auth.service.js';
import { readAccessCookie } from '../utils/authCookies.js';

/**
 * Extract access token from Authorization Bearer header or HttpOnly cookie.
 * Bearer remains supported for backward compatibility during cookie migration.
 * @param {import('express').Request} req
 * @returns {string | null}
 */
function extractAccessToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (header && typeof header === 'string') {
    const [scheme, token] = header.split(' ');
    if (scheme && scheme.toLowerCase() === 'bearer' && token) return token.trim();
  }
  return readAccessCookie(req);
}

async function attachUser(req, user) {
  const sanitized = await sanitizeUser(user);
  req.user = sanitized;
  // Fresh building scope on every request so assignment changes apply immediately
  req.user.buildingIds = sanitized.buildingIds;
}

/**
 * Require a valid access JWT and attach req.user (with permissions + buildingIds).
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    throw new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' });
  }

  const payload = verifyAccess(token);
  const userId = payload.sub;
  if (!userId) {
    throw new AppError('Invalid access token payload', 401, { code: 'INVALID_ACCESS_TOKEN' });
  }

  const user = await findUserByIdWithRole(userId);
  if (!user) {
    throw new AppError('User not found', 401, { code: 'UNAUTHORIZED' });
  }

  if (user.isActive === false) {
    throw new AppError('Account is disabled', 403, { code: 'ACCOUNT_DISABLED' });
  }

  await attachUser(req, user);
  req.accessToken = token;
  next();
});

/**
 * Optionally attach user if a valid Bearer token is present.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyAccess(token);
    const user = await findUserByIdWithRole(payload.sub);
    if (user && user.isActive !== false) {
      await attachUser(req, user);
      req.accessToken = token;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
});

export default { authenticate, optionalAuth };
