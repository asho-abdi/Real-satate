import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assertBuildingAccess,
  assertFloorBuildingAccess,
  assertUnitBuildingAccess,
  isAdminUser,
} from '../services/access.service.js';

/**
 * Require the authenticated user to have access to a building referenced
 * on the request (params / body / query).
 *
 * @param {{ source?: 'params'|'body'|'query', key?: string, optional?: boolean }} options
 */
export function requireBuildingAccess(options = {}) {
  const { source = 'params', key = 'id', optional = false } = options;

  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' });
    }

    const container = req[source] || {};
    const buildingId = container[key];

    if (!buildingId) {
      if (optional) return next();
      throw new AppError(`${key} is required`, 400, { code: 'BUILDING_REQUIRED' });
    }

    await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    return next();
  });
}

/**
 * Require access to the building that owns a unit referenced on the request.
 */
export function requireUnitBuildingAccess(options = {}) {
  const { source = 'body', key = 'unitId', optional = false } = options;

  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' });
    }

    const container = req[source] || {};
    const unitId = container[key];
    if (!unitId) {
      if (optional) return next();
      throw new AppError(`${key} is required`, 400);
    }

    await assertUnitBuildingAccess(req.user, String(unitId), req.user.buildingIds);
    return next();
  });
}

/**
 * Require access to the building that owns a floor referenced on the request.
 */
export function requireFloorBuildingAccess(options = {}) {
  const { source = 'body', key = 'floorId', optional = false } = options;

  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' });
    }

    const container = req[source] || {};
    const floorId = container[key];
    if (!floorId) {
      if (optional) return next();
      throw new AppError(`${key} is required`, 400);
    }

    await assertFloorBuildingAccess(req.user, String(floorId), req.user.buildingIds);
    return next();
  });
}

/**
 * Admin-only guard (role-based).
 */
export function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, { code: 'UNAUTHORIZED' }));
  }
  if (!isAdminUser(req.user)) {
    return next(new AppError('Admin access required', 403, { code: 'FORBIDDEN' }));
  }
  return next();
}

export default {
  requireBuildingAccess,
  requireUnitBuildingAccess,
  requireFloorBuildingAccess,
  requireAdmin,
};
