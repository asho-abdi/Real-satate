import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

/**
 * @param {{ role?: string, roleName?: string, roleRef?: { code?: string } }} user
 */
export function isAdminUser(user) {
  const code = String(user?.roleRef?.code || user?.role || user?.roleName || '').toUpperCase();
  return ADMIN_ROLES.has(code);
}

/**
 * Load permission codes for a user from their role.
 * Admin roles always get wildcard `*`.
 * @param {object} user
 * @returns {Promise<string[]>}
 */
export async function loadPermissionCodes(user) {
  if (isAdminUser(user)) return ['*'];

  const roleId = user.roleId || user.roleRef?.id;
  if (roleId) {
    const rows = await prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: { select: { code: true } } },
    });
    return rows.map((r) => r.permission.code);
  }

  const roleCode = String(user.role || '').toUpperCase();
  if (!roleCode) return [];

  const role = await prisma.role.findUnique({
    where: { code: roleCode },
    include: {
      permissions: { include: { permission: { select: { code: true } } } },
    },
  });
  return role?.permissions?.map((rp) => rp.permission.code) || [];
}

/**
 * Building IDs the user may access.
 * - Admin: `null` (all buildings)
 * - Others: array of assigned building IDs (may be empty)
 * @param {object} user
 * @returns {Promise<string[] | null>}
 */
export async function getAccessibleBuildingIds(user) {
  if (isAdminUser(user)) return null;

  const rows = await prisma.userBuilding.findMany({
    where: { userId: user.id },
    select: { buildingId: true },
  });
  return rows.map((r) => r.buildingId);
}

/**
 * Prisma `where` fragment that restricts buildings to the user's scope.
 * Returns `{}` for admin (no restriction).
 * @param {string[] | null} buildingIds
 */
export function buildingIdFilter(buildingIds) {
  if (buildingIds === null) return {};
  return { id: { in: buildingIds } };
}

/**
 * Prisma filter for resources that have a direct `buildingId` field.
 * @param {string[] | null} buildingIds
 */
export function resourceBuildingFilter(buildingIds) {
  if (buildingIds === null) return {};
  return { buildingId: { in: buildingIds } };
}

/**
 * Prisma filter for resources nested under a unit → building.
 * @param {string[] | null} buildingIds
 */
export function unitBuildingFilter(buildingIds) {
  if (buildingIds === null) return {};
  return { unit: { buildingId: { in: buildingIds } } };
}

/**
 * Prisma filter for payments via tenant/business → unit → building.
 * @param {string[] | null} buildingIds
 */
export function paymentBuildingFilter(buildingIds) {
  if (buildingIds === null) return {};
  return {
    OR: [
      { tenant: { unit: { buildingId: { in: buildingIds } } } },
      { business: { unit: { buildingId: { in: buildingIds } } } },
    ],
  };
}

/**
 * Throw 403 if the user cannot access the given building.
 * @param {object} user
 * @param {string} buildingId
 * @param {string[] | null} [preloadedIds] optional cached accessible IDs
 */
export async function assertBuildingAccess(user, buildingId, preloadedIds) {
  if (!buildingId) {
    throw new AppError('Building id is required', 400, { code: 'BUILDING_REQUIRED' });
  }
  if (isAdminUser(user)) return;

  const ids = preloadedIds !== undefined ? preloadedIds : await getAccessibleBuildingIds(user);
  if (!ids || !ids.includes(buildingId)) {
    throw new AppError('You do not have access to this building', 403, {
      code: 'BUILDING_FORBIDDEN',
    });
  }
}

/**
 * Resolve a building id from a unit, then assert access.
 */
export async function assertUnitBuildingAccess(user, unitId, preloadedIds) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, deletedAt: null },
    select: { buildingId: true },
  });
  if (!unit) throw new AppError('Unit not found', 404);
  await assertBuildingAccess(user, unit.buildingId, preloadedIds);
  return unit.buildingId;
}

/**
 * Resolve building id from a floor, then assert access.
 */
export async function assertFloorBuildingAccess(user, floorId, preloadedIds) {
  const floor = await prisma.floor.findFirst({
    where: { id: floorId, deletedAt: null },
    select: { buildingId: true },
  });
  if (!floor) throw new AppError('Floor not found', 404);
  await assertBuildingAccess(user, floor.buildingId, preloadedIds);
  return floor.buildingId;
}

export default {
  isAdminUser,
  loadPermissionCodes,
  getAccessibleBuildingIds,
  buildingIdFilter,
  resourceBuildingFilter,
  unitBuildingFilter,
  paymentBuildingFilter,
  assertBuildingAccess,
  assertUnitBuildingAccess,
  assertFloorBuildingAccess,
};
