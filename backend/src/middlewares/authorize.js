import { AppError } from '../utils/AppError.js';
import { isAdminUser } from '../services/access.service.js';

/**
 * Check whether the user holds a required permission string.
 * @param {string[]} userPermissions
 * @param {string} required
 */
function hasPermission(userPermissions, required) {
  if (!Array.isArray(userPermissions)) return false;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

/**
 * Require one or more `resource:action` permissions on the route.
 * Admin users and wildcard permissions bypass checks.
 */
export function authorize(...permissionStrings) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' }));
    }

    const permissions = req.user.permissions || [];

    if (isAdminUser(req.user) || permissions.includes('*')) {
      return next();
    }

    const needed = permissionStrings.map(String);
    if (!needed.length) {
      return next();
    }

    const allowed = needed.every((permission) => hasPermission(permissions, permission));
    if (!allowed) {
      return next(new AppError('Insufficient permissions', 403, { code: 'FORBIDDEN' }));
    }

    return next();
  };
}

export default authorize;
