import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import {
  BUILDING_PROPERTY_TYPES,
  buildingHasPropertyType,
  normalizePropertyTypes,
} from '../constants/buildingFeatures.js';

export async function getBuildingById(buildingId, tx = prisma) {
  if (!buildingId) return null;
  return tx.building.findFirst({
    where: { id: buildingId, deletedAt: null },
    select: {
      id: true,
      code: true,
      name: true,
      propertyTypes: true,
    },
  });
}

export async function getBuildingForUnit(unitId, tx = prisma) {
  const unit = await tx.unit.findFirst({
    where: { id: unitId, deletedAt: null },
    select: {
      id: true,
      usage: true,
      buildingId: true,
      building: {
        select: { id: true, code: true, name: true, propertyTypes: true },
      },
    },
  });
  if (!unit) throw new AppError('Unit not found', 404);
  return { unit, building: unit.building };
}

/** Reject guest unit usage on buildings that do not enable GUEST_BOOKINGS. */
export function assertBuildingAllowsGuestUnits(building) {
  if (!buildingHasPropertyType(building, BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS)) {
    throw new AppError(
      `${building?.name || 'This building'} does not support guest house units or bookings`,
      403,
    );
  }
  return building;
}

/** Reject guest bookings on buildings that do not enable GUEST_BOOKINGS. */
export async function assertUnitAllowsGuestBooking(unitId, tx = prisma) {
  const { unit, building } = await getBuildingForUnit(unitId, tx);
  if (unit.usage !== 'GUEST') {
    throw new AppError('Bookings are only allowed on guest units', 400);
  }
  assertBuildingAllowsGuestUnits(building);
  return { unit, building };
}

export function serializeBuildingPropertyTypes(building) {
  if (!building) return building;
  return {
    ...building,
    propertyTypes: normalizePropertyTypes(building.propertyTypes),
  };
}
