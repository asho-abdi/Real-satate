import { AppError } from '../utils/AppError.js';

/**
 * Check whether the user holds a required permission string.
 * @param {string[]} userPermissions
 * @param {string} required
 */
function hasPermission(userPermissions, required) {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

/**
 * Require one or more `resource:action` permissions on the route.
 * ADMIN / SUPER_ADMIN and wildcard permissions bypass checks.
 */
export function authorize(...permissionStrings) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' }));
    }

    const role = String(req.user.role || req.user.roleName || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const permissions = req.user.permissions || [];

    if (isAdmin || permissions.includes('*')) {
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
