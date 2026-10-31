import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  createDeposit,
  depositSummary,
  listDeposits,
  settleDeposit,
} from '../../services/deposit.service.js';
import prisma from '../../config/database.js';

const router = Router();
router.use(authenticate);

function scopeDeposits(rows, buildingIds) {
  if (buildingIds == null) return rows;
  const set = new Set(buildingIds);
  return rows.filter((d) => set.has(d.unit?.buildingId));
}

router.get(
  '/',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const data = await listDeposits({
      tenantId: req.query.tenantId || undefined,
      businessId: req.query.businessId || undefined,
      shopSaleId: req.query.shopSaleId || undefined,
      unitId: req.query.unitId || undefined,
      status: req.query.status || undefined,
      buildingId: req.query.buildingId || undefined,
    });
    return success(res, scopeDeposits(data, req.user.buildingIds));
  }),
);

router.get(
  '/summary',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const buildingIds = req.user.buildingIds === null ? null : req.user.buildingIds;
    return success(res, await depositSummary(buildingIds));
  }),
);

router.get(
  '/:id',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const row = await prisma.securityDeposit.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        unit: { include: { building: true, floor: true } },
        tenant: true,
        business: true,
        shopSale: true,
        transactions: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!row) throw new AppError('Deposit not found', 404);
    if (
      Array.isArray(req.user.buildingIds) &&
      !req.user.buildingIds.includes(row.unit?.buildingId)
    ) {
      throw new AppError('Deposit not found', 404);
    }
    return success(res, row);
  }),
);

router.post(
  '/',
  authorize('payments:create'),
  asyncHandler(async (req, res) => {
    const data = await createDeposit(req.body || {}, req.user.id);
    return success(res, data, 201);
  }),
);

router.post(
  '/:id/settle',
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const data = await settleDeposit(req.params.id, req.body || {}, req.user.id);
    return success(res, data);
  }),
);

export default router;
