import { verifyAccess } from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { findUserByIdWithRole } from '../repositories/user.repository.js';
import { mapUserPermissions, sanitizeUser } from '../services/auth.service.js';

/**
 * Extract Bearer token from Authorization header.
 * @param {import('express').Request} req
 * @returns {string | null}
 */
function extractBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

/**
 * Require a valid access JWT and attach req.user.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
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

  const permissions = mapUserPermissions(user);
  req.user = {
    ...sanitizeUser(user),
    permissions,
  };
  req.accessToken = token;
  next();
});

/**
 * Optionally attach user if a valid Bearer token is present.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyAccess(token);
    const user = await findUserByIdWithRole(payload.sub);
    if (user && user.isActive !== false) {
      req.user = {
        ...sanitizeUser(user),
        permissions: mapUserPermissions(user),
      };
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
