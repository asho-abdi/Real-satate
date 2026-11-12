import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import {
  assertBuildingAccess,
  assertUnitBuildingAccess,
  getAccessibleBuildingIds,
  isAdminUser,
} from './access.service.js';

/**
 * Resolve buildingId for a finance document via unit or related party.
 * Returns null if no building can be resolved (admin-only visibility).
 */
export async function resolveFinanceDocumentBuildingId(doc) {
  if (!doc) return null;

  if (doc.unitId) {
    const unit = await prisma.unit.findFirst({
      where: { id: doc.unitId, deletedAt: null },
      select: { buildingId: true },
    });
    return unit?.buildingId || null;
  }

  if (doc.unit?.buildingId) return doc.unit.buildingId;
  if (doc.unit?.building?.id) return doc.unit.building.id;

  if (doc.tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: doc.tenantId, deletedAt: null },
      select: { unit: { select: { buildingId: true } } },
    });
    return tenant?.unit?.buildingId || null;
  }

  if (doc.businessId) {
    const business = await prisma.business.findFirst({
      where: { id: doc.businessId, deletedAt: null },
      select: { unit: { select: { buildingId: true } } },
    });
    return business?.unit?.buildingId || null;
  }

  if (doc.shopSaleId) {
    const sale = await prisma.shopSale.findFirst({
      where: { id: doc.shopSaleId, deletedAt: null },
      select: { unit: { select: { buildingId: true } } },
    });
    return sale?.unit?.buildingId || null;
  }

  return null;
}

/**
 * Assert the user may read this finance document.
 * Unauthorized → 404 (no existence leak across buildings).
 */
export async function assertFinanceDocumentAccess(user, doc) {
  if (!doc) throw new AppError('Document not found', 404);
  if (isAdminUser(user)) return;

  const buildingId = await resolveFinanceDocumentBuildingId(doc);
  if (!buildingId) {
    // Orphan docs without a building: deny staff
    throw new AppError('Document not found', 404);
  }

  const ids = await getAccessibleBuildingIds(user);
  if (!ids || !ids.includes(buildingId)) {
    throw new AppError('Document not found', 404);
  }
}

/**
 * Prisma where fragment for finance documents scoped to user buildings.
 */
export function financeDocumentBuildingFilter(buildingIds) {
  if (buildingIds === null) return {};
  return {
    OR: [
      { unit: { buildingId: { in: buildingIds } } },
      { tenant: { unit: { buildingId: { in: buildingIds } } } },
      { business: { unit: { buildingId: { in: buildingIds } } } },
      { shopSale: { unit: { buildingId: { in: buildingIds } } } },
    ],
  };
}

/**
 * Assert access to a statement party (tenant / business / shopSale).
 */
export async function assertStatementPartyAccess(user, party) {
  if (isAdminUser(user)) return;

  if (party.tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: party.tenantId, deletedAt: null },
      select: { unitId: true },
    });
    if (!tenant) throw new AppError('Party not found', 404);
    await assertUnitBuildingAccess(user, tenant.unitId);
    return;
  }

  if (party.businessId) {
    const business = await prisma.business.findFirst({
      where: { id: party.businessId, deletedAt: null },
      select: { unitId: true },
    });
    if (!business) throw new AppError('Party not found', 404);
    await assertUnitBuildingAccess(user, business.unitId);
    return;
  }

  if (party.shopSaleId) {
    const sale = await prisma.shopSale.findFirst({
      where: { id: party.shopSaleId, deletedAt: null },
      select: { unitId: true },
    });
    if (!sale) throw new AppError('Party not found', 404);
    await assertUnitBuildingAccess(user, sale.unitId);
    return;
  }

  throw new AppError('Party not found', 404);
}

/**
 * When creating a finance document, assert unit/building access if unitId or party ids present.
 */
export async function assertFinanceCreateAccess(user, body = {}) {
  if (isAdminUser(user)) return;

  if (body.unitId) {
    await assertUnitBuildingAccess(user, body.unitId);
    return;
  }
  if (body.tenantId || body.businessId || body.shopSaleId) {
    await assertStatementPartyAccess(user, {
      tenantId: body.tenantId,
      businessId: body.businessId,
      shopSaleId: body.shopSaleId,
    });
    return;
  }
  // Creating without unit/party: staff must not invent cross-building docs
  throw new AppError('unitId or customer party is required', 400);
}

export { assertBuildingAccess };
