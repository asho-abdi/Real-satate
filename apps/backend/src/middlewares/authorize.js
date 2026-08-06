import { AppError } from '../utils/AppError.js';

/**
 * Simple property system: only ADMIN / SUPER_ADMIN may mutate.
 * Read endpoints still require authentication (applied upstream).
 */
export function authorize(...permissionStrings) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' }));
    }

    const role = String(req.user.role || req.user.roleName || '').toUpperCase();
    const isAdmin =
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN' ||
      (req.user.permissions || []).includes('*');

    if (isAdmin) return next();

    const needed = permissionStrings.map(String);
    const isWrite = needed.some((p) =>
      /:(create|update|delete|export)$/i.test(p) || p.includes('create') || p.includes('update') || p.includes('delete'),
    );

    if (isWrite) {
      return next(new AppError('Insufficient permissions', 403, { code: 'FORBIDDEN' }));
    }

    return next();
  };
}

export default authorize;
