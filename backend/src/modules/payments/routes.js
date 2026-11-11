import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  assertUnitBuildingAccess,
  isAdminUser,
  paymentBuildingFilter,
} from '../../services/access.service.js';
import { normalizePaymentMethod, pickPaymentDetails } from '../../utils/paymentMethod.js';
import { ensurePaymentReceipt } from '../../services/financeReceipt.service.js';
import { logActivity } from '../../services/activity.service.js';

const router = Router();
router.use(authenticate);

const paymentInclude = {
  tenant: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      unit: {
        select: {
          id: true,
          roomNumber: true,
          building: { select: { name: true, code: true } },
          floor: { select: { name: true, level: true } },
        },
      },
    },
  },
  business: {
    select: {
      id: true,
      businessName: true,
      contactName: true,
      phone: true,
      unit: {
        select: {
          id: true,
          roomNumber: true,
          usage: true,
          building: { select: { name: true, code: true } },
          floor: { select: { name: true, level: true } },
        },
      },
    },
  },
};

const partyInclude = {
  tenant: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      unit: {
        select: {
          id: true,
          roomNumber: true,
          building: { select: { name: true } },
          floor: { select: { name: true } },
        },
      },
    },
  },
  business: {
    select: {
      id: true,
      businessName: true,
      phone: true,
      unit: {
        select: {
          id: true,
          roomNumber: true,
          building: { select: { name: true } },
          floor: { select: { name: true } },
        },
      },
    },
  },
};

async function syncMonthlyPaymentReceipt(tx, payment, createdById) {
  const paid = Number(payment.amountPaid);
  if (paid <= 0) return payment;

  const tenant = payment.tenant;
  const business = payment.business;
  const unit = tenant?.unit || business?.unit;
  const customerName = tenant?.fullName || business?.businessName || 'Customer';
  const customerPhone = tenant?.phone || business?.phone || null;
  const due = Number(payment.amountDue);

  const doc = await ensurePaymentReceipt(tx, {
    sourceType: 'MONTHLY_PAYMENT',
    sourceId: payment.id,
    tenantId: payment.tenantId,
    businessId: payment.businessId,
    unitId: unit?.id || null,
    customerName,
    customerPhone,
    amount: paid,
    amountPaid: paid,
    remainingBalance: Math.max(0, Math.round((due - paid) * 100) / 100),
    currentCharges: Number(payment.rentDue ?? due),
    previousBalance: 0,
    method: payment.method,
    reference: payment.reference,
    paymentDate: payment.paymentDate,
    billingPeriod: payment.month,
    description: `Payment received (${payment.month})`,
    createdById,
    meta: {
      buildingName: unit?.building?.name || null,
      floorName: unit?.floor?.name || null,
      unitNumber: unit?.roomNumber || null,
      receivedBy: payment.receivedByName || null,
    },
  });

  if (doc.number && payment.receiptNumber !== doc.number) {
    return tx.monthlyPayment.update({
      where: { id: payment.id },
      data: { receiptNumber: doc.number },
      include: paymentInclude,
    });
  }
  return payment;
}

function serialize(p) {
  if (!p) return p;
  const amountDue = Number(p.amountDue);
  const amountPaid = Number(p.amountPaid);
  const otherCharges = Number(p.otherCharges || 0);
  const rentDue =
    p.rentDue != null ? Number(p.rentDue) : Math.max(0, Math.round((amountDue - otherCharges) * 100) / 100);
  return {
    ...p,
    amountDue,
    amountPaid,
    rentDue,
    otherCharges,
    balance: Math.max(0, Math.round((amountDue - amountPaid) * 100) / 100),
  };
}

function resolveStatus(amountDue, amountPaid) {
  const due = Number(amountDue);
  const paid = Number(amountPaid);
  if (paid <= 0) return 'UNPAID';
  if (paid >= due) return 'PAID';
  return 'PARTIAL';
}

function normalizeMethod(method) {
  if (!method) return null;
  return normalizePaymentMethod(method, { fallback: 'CASH' });
}

router.get(
  '/',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const { status, month, tenantId, businessId } = req.query;
    const where = {
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(month ? { month: String(month) } : {}),
      ...(tenantId ? { tenantId: String(tenantId) } : {}),
      ...(businessId ? { businessId: String(businessId) } : {}),
      ...paymentBuildingFilter(req.user.buildingIds),
    };

    const data = await prisma.monthlyPayment.findMany({
      where,
      include: paymentInclude,
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    });
    return success(res, data.map(serialize));
  }),
);

router.post(
  '/',
  authorize('payments:create'),
  asyncHandler(async (req, res) => {
    const {
      tenantId,
      businessId,
      month,
      amountDue,
      amountPaid = 0,
      rentDue,
      otherCharges = 0,
      status,
      paymentDate,
      method,
      notes,
    } = req.body || {};

    if (!month || amountDue === undefined) {
      throw new AppError('month and amountDue are required', 400);
    }
    if (!tenantId && !businessId) {
      throw new AppError('tenantId or businessId is required', 400);
    }
    if (tenantId && businessId) {
      throw new AppError('Provide either tenantId or businessId, not both', 400);
    }

    if (tenantId) {
      const tenant = await prisma.tenant.findFirst({
        where: { id: String(tenantId), deletedAt: null },
        select: { unitId: true },
      });
      if (!tenant) throw new AppError('Tenant not found', 404);
      await assertUnitBuildingAccess(req.user, tenant.unitId, req.user.buildingIds);
    }
    if (businessId) {
      const business = await prisma.business.findFirst({
        where: { id: String(businessId), deletedAt: null },
        select: { unitId: true },
      });
      if (!business) throw new AppError('Business not found', 404);
      await assertUnitBuildingAccess(req.user, business.unitId, req.user.buildingIds);
    }

    const other = Math.max(0, Number(otherCharges) || 0);
    const rent =
      rentDue !== undefined && rentDue !== null && rentDue !== ''
        ? Math.max(0, Number(rentDue))
        : Math.max(0, Number(amountDue) - other);
    // Total due must equal rent + other charges (correct math)
    const due = Math.round((rent + other) * 100) / 100;
    const paid = Math.min(due, Math.max(0, Number(amountPaid) || 0));
    if (!/^\d{4}-\d{2}$/.test(String(month))) {
      throw new AppError('month must be YYYY-MM', 400);
    }
    const resolved = resolveStatus(due, paid);
    const details =
      method || paid > 0
        ? pickPaymentDetails(req.body || {}, method || 'CASH')
        : { method: null };

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.monthlyPayment.create({
        data: {
          tenantId: tenantId || null,
          businessId: businessId || null,
          month: String(month),
          amountDue: due,
          amountPaid: paid,
          rentDue: rent,
          otherCharges: other,
          status: resolved,
          paymentDate: paymentDate ? new Date(paymentDate) : paid > 0 ? new Date() : null,
          method: details.method,
          reference: details.reference || null,
          receivedByName: details.receivedByName || null,
          agentName: details.agentName || null,
          officeMpesaNumber: details.officeMpesaNumber || null,
          recordedById: req.user.id,
          notes: notes || null,
        },
        include: { ...paymentInclude, ...partyInclude },
      });
      if (paid > 0) {
        return syncMonthlyPaymentReceipt(tx, created, req.user.id);
      }
      return created;
    });

    return success(res, serialize(payment), 201);
  }),
);

function authorizePaymentVoid(req, res, next) {
  const permissions = req.user?.permissions || [];
  if (
    isAdminUser(req.user) ||
    permissions.includes('*') ||
    permissions.includes('payments:update') ||
    permissions.includes('payments:delete')
  ) {
    return next();
  }
  return next(new AppError('Insufficient permissions', 403, { code: 'FORBIDDEN' }));
}

function appendVoidNote(existingNotes, reason, user) {
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    user?.id ||
    'Unknown';
  const stamp = new Date().toISOString();
  const line = `[VOID ${stamp}] ${String(reason).trim()} — by ${actor}`;
  const base = existingNotes ? String(existingNotes).trim() : '';
  return base ? `${base}\n${line}` : line;
}

router.patch(
  '/:id/void',
  authorizePaymentVoid,
  asyncHandler(async (req, res) => {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) throw new AppError('reason is required', 400);

    const existing = await prisma.monthlyPayment.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: { select: { id: true, fullName: true, unitId: true } },
        business: { select: { id: true, businessName: true, unitId: true } },
      },
    });
    if (!existing) throw new AppError('Payment not found', 404);

    const unitId = existing.tenant?.unitId || existing.business?.unitId;
    if (unitId) {
      await assertUnitBuildingAccess(req.user, unitId, req.user.buildingIds);
    }

    const prevPaid = Number(existing.amountPaid);
    if (prevPaid <= 0) {
      throw new AppError('Payment has no recorded amount to void', 400);
    }

    const notes = appendVoidNote(existing.notes, reason, req.user);

    const payment = await prisma.monthlyPayment.update({
      where: { id: existing.id },
      data: {
        amountPaid: 0,
        status: 'UNPAID',
        paymentDate: null,
        method: null,
        reference: null,
        receivedByName: null,
        agentName: null,
        officeMpesaNumber: null,
        notes,
        recordedById: req.user.id,
      },
      include: { ...paymentInclude, ...partyInclude },
    });

    await logActivity({
      entityType: existing.tenantId ? 'TENANT' : 'BUSINESS',
      entityId: existing.tenantId || existing.businessId,
      unitId: unitId || null,
      action: 'PAYMENT_VOIDED',
      summary: `Monthly payment voided (${existing.month}): ${reason}`,
      meta: {
        paymentId: existing.id,
        month: existing.month,
        previousAmountPaid: prevPaid,
        reason,
      },
      actorId: req.user.id,
    });

    return success(res, serialize(payment));
  }),
);

router.patch(
  '/:id',
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.monthlyPayment.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: { select: { unitId: true } },
        business: { select: { unitId: true } },
      },
    });
    if (!existing) throw new AppError('Payment not found', 404);
    const unitId = existing.tenant?.unitId || existing.business?.unitId;
    if (unitId) {
      await assertUnitBuildingAccess(req.user, unitId, req.user.buildingIds);
    }

    const { amountPaid, status, method, paymentDate, notes, amountDue, rentDue, otherCharges } =
      req.body || {};

    const existingOther = Number(existing.otherCharges || 0);
    const existingRent =
      existing.rentDue != null
        ? Number(existing.rentDue)
        : Math.max(0, Number(existing.amountDue) - existingOther);

    const nextOther =
      otherCharges !== undefined ? Math.max(0, Number(otherCharges) || 0) : existingOther;
    const nextRent =
      rentDue !== undefined
        ? Math.max(0, Number(rentDue) || 0)
        : amountDue !== undefined && otherCharges === undefined
          ? Math.max(0, Number(amountDue) - nextOther)
          : existingRent;
    const nextDue =
      amountDue !== undefined && rentDue === undefined && otherCharges === undefined
        ? Number(amountDue)
        : Math.round((nextRent + nextOther) * 100) / 100;
    const nextPaid = amountPaid !== undefined ? Number(amountPaid) : Number(existing.amountPaid);
    const nextStatus = resolveStatus(nextDue, nextPaid);
    const details =
      method !== undefined
        ? pickPaymentDetails(req.body || {}, method)
        : null;

    const payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.monthlyPayment.update({
        where: { id: existing.id },
        data: {
          amountDue: nextDue,
          amountPaid: nextPaid,
          rentDue: nextRent,
          otherCharges: nextOther,
          status: nextStatus,
          ...(details
            ? {
                method: details.method,
                reference: details.reference,
                receivedByName: details.receivedByName,
                agentName: details.agentName,
                officeMpesaNumber: details.officeMpesaNumber,
              }
            : {}),
          ...(paymentDate !== undefined && {
            paymentDate: paymentDate ? new Date(paymentDate) : null,
          }),
          ...(notes !== undefined && { notes }),
          ...(amountPaid !== undefined && nextPaid > 0 && paymentDate === undefined
            ? { paymentDate: existing.paymentDate || new Date() }
            : {}),
          recordedById: req.user.id,
        },
        include: { ...paymentInclude, ...partyInclude },
      });
      if (nextPaid > 0) {
        return syncMonthlyPaymentReceipt(tx, updated, req.user.id);
      }
      return updated;
    });

    return success(res, serialize(payment));
  }),
);

export default router;
