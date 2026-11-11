import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  assertUnitBuildingAccess,
  unitBuildingFilter,
} from '../../services/access.service.js';
import { logActivity } from '../../services/activity.service.js';
import { currentMonthKey } from '../../utils/rent.js';
import {
  findOwnerMonthlyCharge,
  OWNER_MONTHLY_CATEGORY,
} from '../../services/ownerCharge.service.js';
import { ensurePaymentReceipt } from '../../services/financeReceipt.service.js';
import { normalizePaymentMethod, pickPaymentDetails } from '../../utils/paymentMethod.js';

const router = Router();
router.use(authenticate);

function money(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function resolveStatus(amountDue, amountPaid) {
  const due = money(amountDue);
  const paid = money(amountPaid);
  if (paid <= 0) return 'UNPAID';
  if (paid + 0.001 >= due) return 'PAID';
  return 'PARTIAL';
}

function serialize(c) {
  if (!c) return c;
  const amountDue = money(c.amountDue);
  const amountPaid = money(c.amountPaid);
  return {
    ...c,
    amountDue,
    amountPaid,
    balance: Math.max(0, money(amountDue - amountPaid)),
  };
}

router.get(
  '/',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const { businessId, tenantId, unitId, status } = req.query;
    if (unitId) {
      await assertUnitBuildingAccess(req.user, String(unitId), req.user.buildingIds);
    }
    const rows = await prisma.leaseCharge.findMany({
      where: {
        deletedAt: null,
        ...unitBuildingFilter(req.user.buildingIds),
        ...(businessId ? { businessId: String(businessId) } : {}),
        ...(tenantId ? { tenantId: String(tenantId) } : {}),
        ...(unitId ? { unitId: String(unitId) } : {}),
        ...(status ? { status: String(status).toUpperCase() } : {}),
      },
      orderBy: { chargeDate: 'desc' },
    });
    return success(res, rows.map(serialize));
  }),
);

router.post(
  '/',
  authorize('payments:create'),
  asyncHandler(async (req, res) => {
    const {
      businessId,
      tenantId,
      unitId,
      category = 'OTHER',
      description,
      amountDue,
      amountPaid = 0,
      chargeDate,
      dueDate,
      month,
      notes,
      paymentMethod = 'CASH',
    } = req.body || {};

    if (!description || amountDue === undefined || amountDue === null || amountDue === '') {
      throw new AppError('description and amountDue are required', 400);
    }
    let resolvedUnitId = unitId || null;
    let saleId = null;
    if (!businessId && !tenantId) {
      if (!unitId) throw new AppError('unitId is required for an owner charge', 400);
      const sale = await prisma.shopSale.findFirst({
        where: { unitId: String(unitId), deletedAt: null, ownershipStatus: 'ACTIVE_OWNER' },
      });
      if (!sale) throw new AppError('This unit has no active owner to charge', 400);
      saleId = sale.id;
      resolvedUnitId = sale.unitId;
    } else if (businessId) {
      const biz = await prisma.business.findFirst({
        where: { id: businessId, deletedAt: null },
      });
      if (!biz) throw new AppError('Business lease not found', 404);
      if (biz.status !== 'ACTIVE') throw new AppError('Can only charge an active lease', 400);
      resolvedUnitId = biz.unitId;
    } else {
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
      });
      if (!tenant) throw new AppError('Tenant lease not found', 404);
      if (tenant.status !== 'ACTIVE') throw new AppError('Can only charge an active lease', 400);
      resolvedUnitId = tenant.unitId;
    }

    await assertUnitBuildingAccess(req.user, resolvedUnitId, req.user.buildingIds);

    const due = money(amountDue);
    if (due <= 0) throw new AppError('amountDue must be positive', 400);
    const paid = Math.min(due, Math.max(0, money(amountPaid)));
    const status = resolveStatus(due, paid);
    const cat = String(category || (saleId ? OWNER_MONTHLY_CATEGORY : 'OTHER')).toUpperCase();
    const monthKey = month ? String(month) : currentMonthKey();

    // One monthly owner charge per unit/month — prevent duplicates
    if (saleId && (cat === OWNER_MONTHLY_CATEGORY || cat === 'MAINTENANCE')) {
      const existing = await findOwnerMonthlyCharge(prisma, resolvedUnitId, monthKey);
      if (existing) {
        throw new AppError(
          `A monthly charge for ${monthKey} already exists on this shop. Record a payment on that charge instead.`,
          409,
        );
      }
    }

    const created = await prisma.leaseCharge.create({
      data: {
        businessId: businessId || null,
        tenantId: tenantId || null,
        unitId: resolvedUnitId,
        category: saleId && cat === 'MAINTENANCE' ? OWNER_MONTHLY_CATEGORY : cat,
        description: String(description).trim(),
        amountDue: due,
        amountPaid: paid,
        status,
        chargeDate: chargeDate ? new Date(chargeDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        month: monthKey,
        notes: notes ? String(notes).trim() : null,
        createdById: req.user.id || null,
      },
    });

    await logActivity({
      entityType: businessId ? 'BUSINESS' : tenantId ? 'TENANT' : 'SHOP_SALE',
      entityId: businessId || tenantId || saleId,
      unitId: resolvedUnitId,
      action: 'CHARGE_ADDED',
      summary: `Other charge added: ${created.description} (${due})`,
      meta: { chargeId: created.id, category: created.category, amountDue: due },
      actorId: req.user.id,
    });

    // paymentMethod unused for create unless paid>0 - keep for future receipt notes
    void paymentMethod;

    return success(res, serialize(created), 201);
  }),
);

router.patch(
  '/:id',
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.leaseCharge.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Charge not found', 404);
    await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);

    const {
      description,
      category,
      amountDue,
      amountPaid,
      chargeDate,
      dueDate,
      month,
      notes,
      addPayment,
      paymentMethod,
    } = req.body || {};

    let nextDue = amountDue !== undefined ? money(amountDue) : money(existing.amountDue);
    let nextPaid = amountPaid !== undefined ? money(amountPaid) : money(existing.amountPaid);
    if (addPayment !== undefined && addPayment !== null && addPayment !== '') {
      nextPaid = money(nextPaid + money(addPayment));
    }
    nextPaid = Math.min(nextDue, Math.max(0, nextPaid));
    const paymentIncreased =
      Boolean(addPayment) ||
      (amountPaid !== undefined && money(amountPaid) > money(existing.amountPaid));
    const incrementalPaid = money(nextPaid - money(existing.amountPaid));

    let payDetails = null;
    if (paymentIncreased && incrementalPaid > 0) {
      const method = normalizePaymentMethod(paymentMethod || existing.method || 'CASH', {
        fallback: 'CASH',
      });
      payDetails = pickPaymentDetails(req.body || {}, method);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.leaseCharge.update({
        where: { id: existing.id },
        data: {
          ...(description !== undefined && { description: String(description).trim() }),
          ...(category !== undefined && { category: String(category).toUpperCase() }),
          amountDue: nextDue,
          amountPaid: nextPaid,
          status: resolveStatus(nextDue, nextPaid),
          ...(chargeDate !== undefined && {
            chargeDate: chargeDate ? new Date(chargeDate) : existing.chargeDate,
          }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(month !== undefined && { month: month || null }),
          ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
          ...(payDetails
            ? {
                method: payDetails.method,
                reference: payDetails.reference,
                receivedByName: payDetails.receivedByName,
                agentName: payDetails.agentName,
                officeMpesaNumber: payDetails.officeMpesaNumber,
              }
            : {}),
        },
        include: {
          tenant: true,
          business: true,
          unit: { include: { building: true, floor: true } },
        },
      });

      if (paymentIncreased && incrementalPaid > 0) {
        const customerName =
          row.tenant?.fullName || row.business?.businessName || 'Customer';
        const customerPhone = row.tenant?.phone || row.business?.phone || null;
        const receipt = await ensurePaymentReceipt(tx, {
          sourceType: 'LEASE_CHARGE',
          sourceId: row.id,
          tenantId: row.tenantId,
          businessId: row.businessId,
          unitId: row.unitId,
          customerName,
          customerPhone,
          amount: incrementalPaid,
          amountPaid: incrementalPaid,
          remainingBalance: Math.max(0, money(nextDue - nextPaid)),
          currentCharges: nextDue,
          previousBalance: Math.max(0, money(nextDue - money(existing.amountPaid))),
          method: payDetails?.method || row.method,
          reference: payDetails?.reference || row.reference,
          paymentDate: new Date(),
          billingPeriod: row.month,
          description: `Payment — ${row.description || row.category}`,
          createdById: req.user.id || null,
        });
        if (receipt?.number && !row.receiptNumber) {
          await tx.leaseCharge.update({
            where: { id: row.id },
            data: { receiptNumber: receipt.number },
          });
        }
      }

      return row;
    });

    if (paymentIncreased) {
      let entityType = existing.businessId ? 'BUSINESS' : existing.tenantId ? 'TENANT' : null;
      let entityId = existing.businessId || existing.tenantId || null;
      if (!entityId) {
        const sale = await prisma.shopSale.findFirst({
          where: { unitId: existing.unitId, deletedAt: null, ownershipStatus: 'ACTIVE_OWNER' },
        });
        if (sale) {
          entityType = 'SHOP_SALE';
          entityId = sale.id;
        }
      }
      if (entityId) {
        await logActivity({
          entityType,
          entityId,
          unitId: existing.unitId,
          action: 'CHARGE_PAYMENT',
          summary: `Payment recorded on charge: ${updated.description}`,
          meta: { chargeId: updated.id, amountPaid: money(updated.amountPaid) },
          actorId: req.user.id,
        });
      }
    }

    return success(res, serialize(updated));
  }),
);

router.delete(
  '/:id',
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.leaseCharge.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Charge not found', 404);
    await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);
    if (money(existing.amountPaid) > 0) {
      throw new AppError('Cannot delete a charge that already has payments — set amount due instead', 400);
    }
    await prisma.leaseCharge.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
