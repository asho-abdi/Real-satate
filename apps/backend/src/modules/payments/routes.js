import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';

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
          building: { select: { name: true, code: true } },
          floor: { select: { name: true, level: true } },
        },
      },
    },
  },
};

function serialize(p) {
  if (!p) return p;
  return {
    ...p,
    amountDue: Number(p.amountDue),
    amountPaid: Number(p.amountPaid),
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
  const m = String(method).toUpperCase().replace(/-/g, '_');
  if (m === 'E_BESA' || m === 'EBESA') return 'E_BESA';
  if (m === 'CASH') return 'CASH';
  return null;
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

    const paid = Number(amountPaid) || 0;
    const due = Number(amountDue);
    if (!/^\d{4}-\d{2}$/.test(String(month))) {
      throw new AppError('month must be YYYY-MM', 400);
    }
    const resolved = resolveStatus(due, paid);
    const methodValue = normalizeMethod(method);
    if (method && !methodValue) {
      throw new AppError('method must be CASH or E_BESA', 400);
    }

    const payment = await prisma.monthlyPayment.create({
      data: {
        tenantId: tenantId || null,
        businessId: businessId || null,
        month: String(month),
        amountDue: due,
        amountPaid: paid,
        status: resolved,
        paymentDate: paymentDate ? new Date(paymentDate) : paid > 0 ? new Date() : null,
        method: methodValue,
        notes: notes || null,
      },
      include: paymentInclude,
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
    });
    if (!existing) throw new AppError('Payment not found', 404);

    const { amountPaid, status, method, paymentDate, notes, amountDue } = req.body || {};

    const nextPaid = amountPaid !== undefined ? Number(amountPaid) : Number(existing.amountPaid);
    const nextDue = amountDue !== undefined ? Number(amountDue) : Number(existing.amountDue);
    const nextStatus = resolveStatus(nextDue, nextPaid);

    const payment = await prisma.monthlyPayment.update({
      where: { id: existing.id },
      data: {
        ...(amountPaid !== undefined && { amountPaid: nextPaid }),
        ...(amountDue !== undefined && { amountDue: nextDue }),
        status: nextStatus,
        ...(method !== undefined && { method: normalizeMethod(method) }),
        ...(paymentDate !== undefined && {
          paymentDate: paymentDate ? new Date(paymentDate) : null,
        }),
        ...(notes !== undefined && { notes }),
        ...(amountPaid !== undefined && nextPaid > 0 && paymentDate === undefined
          ? { paymentDate: existing.paymentDate || new Date() }
          : {}),
      },
      include: paymentInclude,
    });

    return success(res, serialize(payment));
  }),
);

export default router;
