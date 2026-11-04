import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  assertUnitBuildingAccess,
  paymentBuildingFilter,
} from '../../services/access.service.js';
import { normalizePaymentMethod, pickPaymentDetails } from '../../utils/paymentMethod.js';
import { nextDocumentNumber } from '../../services/documentNumber.service.js';

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
          roomNumber: true,
          usage: true,
          building: { select: { name: true, code: true } },
          floor: { select: { name: true, level: true } },
        },
      },
    },
  },
};

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
      let receiptNumber = null;
      if (paid > 0) {
        receiptNumber = await nextDocumentNumber(tx, 'RECEIPT');
      }
      return tx.monthlyPayment.create({
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
          receiptNumber,
          recordedById: req.user.id,
          notes: notes || null,
        },
        include: paymentInclude,
      });
    });

    return success(res, serialize(payment), 201);
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
      let receiptNumber = existing.receiptNumber;
      if (nextPaid > Number(existing.amountPaid) && !receiptNumber) {
        receiptNumber = await nextDocumentNumber(tx, 'RECEIPT');
      }
      return tx.monthlyPayment.update({
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
          ...(receiptNumber ? { receiptNumber } : {}),
          recordedById: req.user.id,
        },
        include: paymentInclude,
      });
    });

    return success(res, serialize(payment));
  }),
);

export default router;
