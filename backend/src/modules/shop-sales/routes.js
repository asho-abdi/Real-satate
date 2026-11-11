import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { currentMonthKey } from '../../utils/rent.js';
import {
  assertUnitBuildingAccess,
  unitBuildingFilter,
} from '../../services/access.service.js';
import {
  ensureOwnerMonthlyCharge,
  findOwnerMonthlyCharge,
  OWNER_MONTHLY_CATEGORY,
} from '../../services/ownerCharge.service.js';
import { logActivity } from '../../services/activity.service.js';
import {
  normalizePaymentMethod,
  pickPaymentDetails,
} from '../../utils/paymentMethod.js';
import { ensurePaymentReceipt } from '../../services/financeReceipt.service.js';

const router = Router();
router.use(authenticate);

const saleInclude = {
  unit: {
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
  },
  salePayments: { orderBy: { paymentDate: 'asc' } },
  maintenancePayments: { orderBy: { month: 'desc' }, take: 24 },
};

function serialize(s, ownerCharges = []) {
  if (!s) return s;
  const salePrice = Number(s.salePrice);
  const amountPaid = Number(s.amountPaid || 0);
  const charges = (ownerCharges || []).map((c) => ({
    ...c,
    amountDue: Number(c.amountDue),
    amountPaid: Number(c.amountPaid),
    balance: Math.max(0, Math.round((Number(c.amountDue) - Number(c.amountPaid)) * 100) / 100),
  }));
  const usage = s.unit?.usage || null;
  const commercialType =
    s.unit?.commercialType ||
    (usage === 'SHOP' || usage === 'OFFICE' ? usage : null);
  return {
    ...s,
    commercialType,
    salePrice,
    amountPaid,
    balance: Math.max(0, Math.round((salePrice - amountPaid) * 100) / 100),
    monthlyMaintenance: Number(s.monthlyMaintenance || 0),
    monthlyCharge: Number(s.monthlyMaintenance || 0),
    salePayments: (s.salePayments || []).map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
    // Legacy history only — not used for new billing
    maintenancePayments: (s.maintenancePayments || []).map((p) => ({
      ...p,
      amountDue: Number(p.amountDue),
      amountPaid: Number(p.amountPaid),
      legacy: true,
    })),
    ownerCharges: charges,
  };
}

async function loadOwnerChargesForUnits(unitIds) {
  if (!unitIds.length) return new Map();
  const rows = await prisma.leaseCharge.findMany({
    where: {
      unitId: { in: unitIds },
      deletedAt: null,
      businessId: null,
      tenantId: null,
    },
    orderBy: [{ month: 'desc' }, { chargeDate: 'desc' }],
  });
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.unitId) || [];
    list.push(row);
    map.set(row.unitId, list);
  }
  return map;
}

function derivePaymentStatus(amountPaid, total) {
  const paid = Number(amountPaid) || 0;
  const due = Number(total) || 0;
  if (paid <= 0) return 'UNPAID';
  if (paid + 0.001 >= due) return 'PAID';
  return 'PARTIAL';
}

router.get(
  '/',
  authorize('businesses:read'),
  asyncHandler(async (req, res) => {
    const { buildingId, status, usage: usageQ, commercialType: commercialQ } = req.query;
    const commercialRaw = String(commercialQ || usageQ || '').toUpperCase();
    const typeFilter =
      commercialRaw === 'SHOP' || commercialRaw === 'OFFICE'
        ? commercialRaw
        : commercialRaw === 'ALL' ||
            commercialRaw === 'COMMERCIAL' ||
            commercialRaw === 'SHOP,OFFICE'
          ? 'COMMERCIAL'
          : null;
    const buildingFilter = buildingId
      ? { unit: { buildingId: String(buildingId), deletedAt: null } }
      : unitBuildingFilter(req.user.buildingIds);
    const where = {
      deletedAt: null,
      ...(status ? { ownershipStatus: String(status).toUpperCase() } : {}),
      ...buildingFilter,
    };
    if (typeFilter === 'COMMERCIAL') {
      where.unit = {
        ...(buildingFilter.unit || {}),
        usage: { in: ['SHOP', 'OFFICE'] },
        deletedAt: null,
      };
    } else if (typeFilter) {
      where.unit = {
        ...(buildingFilter.unit || {}),
        usage: typeFilter,
        deletedAt: null,
      };
    }
    const rows = await prisma.shopSale.findMany({
      where,
      include: saleInclude,
      orderBy: { saleDate: 'desc' },
    });
    const chargeMap = await loadOwnerChargesForUnits(rows.map((r) => r.unitId));
    return success(
      res,
      rows.map((r) => serialize(r, chargeMap.get(r.unitId) || [])),
    );
  }),
);

router.get(
  '/:id',
  authorize('businesses:read'),
  asyncHandler(async (req, res) => {
    const sale = await prisma.shopSale.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: saleInclude,
    });
    if (!sale) throw new AppError('Shop sale not found', 404);
    await assertUnitBuildingAccess(req.user, sale.unitId, req.user.buildingIds);
    const chargeMap = await loadOwnerChargesForUnits([sale.unitId]);
    return success(res, serialize(sale, chargeMap.get(sale.unitId) || []));
  }),
);

router.post(
  '/',
  authorize('businesses:create'),
  asyncHandler(async (req, res) => {
    const {
      unitId,
      buyerName,
      contactName,
      phone,
      idNumber,
      identityDocument,
      identityDocumentName,
      salePrice,
      saleDate,
      amountPaid = 0,
      monthlyMaintenance = 0,
      maintenanceDueDay = 1,
      notes,
      paymentMethod = 'CASH',
    } = req.body || {};

    if (!unitId || !buyerName || !phone || salePrice === undefined || !saleDate) {
      throw new AppError('unitId, buyerName, phone, salePrice, and saleDate are required', 400);
    }

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);
    if (unit.usage !== 'SHOP' && unit.usage !== 'OFFICE') {
      throw new AppError('Only shop or office units can be sold', 400);
    }
    const expectedUsage = req.body?.expectedUsage
      ? String(req.body.expectedUsage).toUpperCase()
      : null;
    if (expectedUsage === 'SHOP' || expectedUsage === 'OFFICE') {
      if (unit.usage !== expectedUsage) {
        throw new AppError(
          `This unit is a ${unit.usage.toLowerCase()} and cannot be sold as a ${expectedUsage.toLowerCase()}`,
          400,
        );
      }
    }
    if (!['AVAILABLE', 'RESERVED'].includes(unit.status)) {
      throw new AppError(`Unit is ${unit.status.toLowerCase()} and cannot be sold`, 400);
    }

    const activeSale = await prisma.shopSale.findFirst({
      where: { unitId, deletedAt: null, ownershipStatus: 'ACTIVE_OWNER' },
    });
    if (activeSale) throw new AppError('This shop already has an active sale/owner', 409);

    const activeBiz = await prisma.business.findFirst({
      where: { unitId, deletedAt: null, status: 'ACTIVE' },
    });
    if (activeBiz) throw new AppError('This shop has an active rental lease — end it first', 409);

    const price = Number(salePrice);
    const paid = Math.min(Math.max(0, Number(amountPaid) || 0), price);
    const paymentMethodValue = normalizePaymentMethod(paymentMethod, { fallback: 'CASH' });
    const payDetails =
      paid > 0 ? pickPaymentDetails(req.body || {}, paymentMethodValue) : { method: paymentMethodValue };
    const month = currentMonthKey(saleDate);
    const maint = Math.max(0, Number(monthlyMaintenance) || 0);

    const created = await prisma.$transaction(async (tx) => {
      const sale = await tx.shopSale.create({
        data: {
          unitId,
          buyerName: String(buyerName).trim(),
          contactName: contactName ? String(contactName).trim() : null,
          phone: String(phone).trim(),
          idNumber: idNumber ? String(idNumber).trim() : null,
          identityDocument: identityDocument || null,
          identityDocumentName: identityDocumentName || null,
          salePrice: price,
          saleDate: new Date(saleDate),
          amountPaid: paid,
          paymentStatus: derivePaymentStatus(paid, price),
          ownershipStatus: 'ACTIVE_OWNER',
          monthlyMaintenance: maint,
          maintenanceDueDay: Math.min(28, Math.max(1, Number(maintenanceDueDay) || 1)),
          notes: notes ? String(notes).trim() : null,
        },
      });

      if (paid > 0) {
        await tx.shopSalePayment.create({
          data: {
            saleId: sale.id,
            amount: paid,
            method: payDetails.method,
            paymentDate: new Date(saleDate),
            reference: payDetails.reference || null,
            receivedByName: payDetails.receivedByName || null,
            agentName: payDetails.agentName || null,
            officeMpesaNumber: payDetails.officeMpesaNumber || null,
            comment: 'Initial sale payment',
            recordedById: req.user.id || null,
          },
        });
      }

      // Owner monthly fee → Other Charges only (not ShopMaintenancePayment)
      if (maint > 0) {
        await ensureOwnerMonthlyCharge(tx, {
          unitId,
          month,
          amountDue: maint,
          actorId: req.user.id || null,
          description: `Monthly charge ${month}`,
        });
      }

      await tx.unit.update({
        where: { id: unitId },
        data: {
          status: 'SOLD',
          transactionType: 'FOR_SALE',
          salePrice: price,
        },
      });

      return tx.shopSale.findFirst({ where: { id: sale.id }, include: saleInclude });
    });

    const chargeMap = await loadOwnerChargesForUnits([created.unitId]);
    return success(res, serialize(created, chargeMap.get(created.unitId) || []), 201);
  }),
);

router.post(
  '/:id/payments',
  authorize('businesses:update'),
  asyncHandler(async (req, res) => {
    const sale = await prisma.shopSale.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!sale) throw new AppError('Shop sale not found', 404);
    await assertUnitBuildingAccess(req.user, sale.unitId, req.user.buildingIds);

    const { amount, paymentMethod = 'CASH', paymentDate, comment } = req.body || {};
    if (!amount || Number(amount) <= 0) throw new AppError('Positive amount required', 400);

    const paymentMethodValue = normalizePaymentMethod(paymentMethod, { fallback: 'CASH' });
    const payDetails = pickPaymentDetails(req.body || {}, paymentMethodValue);
    const price = Number(sale.salePrice);
    const current = Number(sale.amountPaid || 0);
    const next = Math.min(price, Math.round((current + Number(amount)) * 100) / 100);
    const applied = Math.round((next - current) * 100) / 100;
    if (applied <= 0) throw new AppError('Sale is already fully paid', 400);

    const updated = await prisma.$transaction(async (tx) => {
      const sp = await tx.shopSalePayment.create({
        data: {
          saleId: sale.id,
          amount: applied,
          method: payDetails.method,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          reference: payDetails.reference || null,
          receivedByName: payDetails.receivedByName || null,
          agentName: payDetails.agentName || null,
          officeMpesaNumber: payDetails.officeMpesaNumber || null,
          comment: comment || null,
          recordedById: req.user.id || null,
        },
      });

      const receipt = await ensurePaymentReceipt(tx, {
        sourceType: 'SHOP_SALE_PAYMENT',
        sourceId: sp.id,
        shopSaleId: sale.id,
        unitId: sale.unitId,
        customerName: sale.buyerName,
        customerPhone: sale.phone || null,
        amount: applied,
        amountPaid: applied,
        remainingBalance: Math.max(0, Math.round((price - next) * 100) / 100),
        currentCharges: price,
        previousBalance: Math.max(0, Math.round((price - current) * 100) / 100),
        method: payDetails.method,
        reference: payDetails.reference,
        paymentDate: paymentDate || new Date(),
        description: 'Sale payment received',
        createdById: req.user.id || null,
      });
      if (receipt?.number) {
        await tx.shopSalePayment.update({
          where: { id: sp.id },
          data: { receiptNumber: receipt.number },
        });
      }

      return tx.shopSale.update({
        where: { id: sale.id },
        data: {
          amountPaid: next,
          paymentStatus: derivePaymentStatus(next, price),
        },
        include: saleInclude,
      });
    });

    return success(res, serialize(updated), 201);
  }),
);

/**
 * Record / upsert the owner's monthly charge via Other Charges (LeaseCharge).
 * Legacy ShopMaintenancePayment rows are kept for history but not written here.
 */
router.post(
  '/:id/maintenance',
  authorize('businesses:update'),
  asyncHandler(async (req, res) => {
    const sale = await prisma.shopSale.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!sale) throw new AppError('Shop sale not found', 404);
    await assertUnitBuildingAccess(req.user, sale.unitId, req.user.buildingIds);

    const {
      month = currentMonthKey(),
      amountPaid,
      amountDue,
      notes,
      paymentMethod = 'CASH',
    } = req.body || {};

    if (amountPaid === undefined) throw new AppError('amountPaid is required', 400);
    const configured = Number(sale.monthlyMaintenance) || 0;
    const due = Math.max(0, Number(amountDue) || configured);
    if (due <= 0) throw new AppError('No monthly charge configured for this sale', 400);

    const monthKey = String(month);
    const paid = Math.min(due, Math.max(0, Number(amountPaid)));
    const payDetails =
      paid > 0
        ? pickPaymentDetails(req.body || {}, normalizePaymentMethod(paymentMethod, { fallback: 'CASH' }))
        : null;

    const row = await prisma.$transaction(async (tx) => {
      let charge = await findOwnerMonthlyCharge(tx, sale.unitId, monthKey);
      if (!charge) {
        const created = await ensureOwnerMonthlyCharge(tx, {
          unitId: sale.unitId,
          month: monthKey,
          amountDue: due,
          actorId: req.user.id || null,
          description: `Monthly charge ${monthKey}`,
        });
        charge = created?.charge;
      }

      if (!charge) throw new AppError('Could not create monthly charge', 500);

      const nextPaid = Math.min(
        Number(charge.amountDue) || due,
        Math.max(Number(charge.amountPaid) || 0, paid),
      );
      const updated = await tx.leaseCharge.update({
        where: { id: charge.id },
        data: {
          amountDue: Number(charge.amountDue) || due,
          amountPaid: nextPaid,
          status: derivePaymentStatus(nextPaid, Number(charge.amountDue) || due),
          notes: notes || charge.notes || null,
          category: OWNER_MONTHLY_CATEGORY,
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
      });

      await logActivity({
        tx,
        entityType: 'SHOP_SALE',
        entityId: sale.id,
        unitId: sale.unitId,
        action: 'CHARGE_PAYMENT',
        summary: `Monthly charge payment recorded for ${monthKey}`,
        meta: { chargeId: updated.id, amountPaid: nextPaid },
        actorId: req.user.id,
      });

      return updated;
    });

    return success(res, {
      id: row.id,
      month: row.month,
      amountDue: Number(row.amountDue),
      amountPaid: Number(row.amountPaid),
      status: row.status,
      source: 'lease_charge',
    });
  }),
);

router.patch(
  '/:id',
  authorize('businesses:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.shopSale.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Shop sale not found', 404);
    await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);

    const {
      buyerName,
      contactName,
      phone,
      monthlyMaintenance,
      maintenanceDueDay,
      notes,
      ownershipStatus,
    } = req.body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.shopSale.update({
        where: { id: existing.id },
        data: {
          ...(buyerName !== undefined && { buyerName: String(buyerName).trim() }),
          ...(contactName !== undefined && {
            contactName: contactName ? String(contactName).trim() : null,
          }),
          ...(phone !== undefined && { phone: String(phone).trim() }),
          ...(monthlyMaintenance !== undefined && {
            monthlyMaintenance: Number(monthlyMaintenance) || 0,
          }),
          ...(maintenanceDueDay !== undefined && {
            maintenanceDueDay: Math.min(28, Math.max(1, Number(maintenanceDueDay) || 1)),
          }),
          ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
          ...(ownershipStatus !== undefined && {
            ownershipStatus: String(ownershipStatus).toUpperCase(),
          }),
        },
        include: saleInclude,
      });

      if (ownershipStatus && String(ownershipStatus).toUpperCase() !== 'ACTIVE_OWNER') {
        await tx.unit.update({
          where: { id: existing.unitId },
          data: { status: 'AVAILABLE' },
        });
      }

      return sale;
    });

    return success(res, serialize(updated));
  }),
);

export default router;
