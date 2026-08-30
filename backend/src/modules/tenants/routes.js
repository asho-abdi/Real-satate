import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { currentMonthKey } from '../../utils/rent.js';

const router = Router();
router.use(authenticate);

const tenantInclude = {
  unit: {
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
  },
};

function serialize(t) {
  if (!t) return t;
  return {
    ...t,
    monthlyRent: Number(t.monthlyRent),
    discount: Number(t.discount),
  };
}

router.get(
  '/',
  authorize('tenants:read'),
  asyncHandler(async (_req, res) => {
    const data = await prisma.tenant.findMany({
      where: { deletedAt: null },
      include: tenantInclude,
      orderBy: { createdAt: 'desc' },
    });
    return success(res, data.map(serialize));
  }),
);

router.post(
  '/',
  authorize('tenants:create'),
  asyncHandler(async (req, res) => {
    const {
      fullName,
      phone,
      idNumber,
      nationality,
      gender,
      emergencyContact,
      unitId,
      monthlyRent,
      discount = 0,
      leaseStart,
      leaseEnd,
    } = req.body || {};

    if (!fullName || !phone || !idNumber || !unitId || !leaseStart) {
      throw new AppError('fullName, phone, idNumber, unitId, and leaseStart are required', 400);
    }

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    if (unit.usage !== 'APARTMENT') {
      throw new AppError('Tenants can only be assigned to apartment units', 400);
    }
    if (unit.status !== 'AVAILABLE') {
      throw new AppError(`Unit is ${unit.status.toLowerCase()} and cannot be rented`, 400);
    }

    const rent = monthlyRent !== undefined ? monthlyRent : unit.monthlyRent;
    const disc = discount !== undefined ? discount : unit.discount;
    const amountDue = Math.max(0, Number(rent) - Number(disc));
    const month = currentMonthKey();

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          fullName: String(fullName).trim(),
          phone: String(phone).trim(),
          idNumber: String(idNumber).trim(),
          nationality: nationality || null,
          gender: gender ? String(gender).toUpperCase() : null,
          emergencyContact: emergencyContact || null,
          unitId,
          monthlyRent: rent,
          discount: disc,
          leaseStart: new Date(leaseStart),
          leaseEnd: leaseEnd ? new Date(leaseEnd) : null,
          status: 'ACTIVE',
        },
        include: tenantInclude,
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { status: 'OCCUPIED' },
      });

      await tx.monthlyPayment.create({
        data: {
          tenantId: created.id,
          month,
          amountDue,
          amountPaid: 0,
          status: 'UNPAID',
        },
      });

      return created;
    });

    return success(res, serialize(tenant), 201);
  }),
);

router.patch(
  '/:id',
  authorize('tenants:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.tenant.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Tenant not found', 404);

    const {
      fullName,
      phone,
      idNumber,
      nationality,
      gender,
      emergencyContact,
      monthlyRent,
      discount,
      leaseStart,
      leaseEnd,
      status,
    } = req.body || {};

    const tenant = await prisma.tenant.update({
      where: { id: existing.id },
      data: {
        ...(fullName !== undefined && { fullName: String(fullName).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() }),
        ...(idNumber !== undefined && { idNumber: String(idNumber).trim() }),
        ...(nationality !== undefined && { nationality }),
        ...(gender !== undefined && { gender: gender ? String(gender).toUpperCase() : null }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(monthlyRent !== undefined && { monthlyRent }),
        ...(discount !== undefined && { discount }),
        ...(leaseStart !== undefined && { leaseStart: new Date(leaseStart) }),
        ...(leaseEnd !== undefined && { leaseEnd: leaseEnd ? new Date(leaseEnd) : null }),
        ...(status !== undefined && { status: String(status).toUpperCase() }),
      },
      include: tenantInclude,
    });

    if (status && String(status).toUpperCase() === 'ENDED') {
      await prisma.unit.update({
        where: { id: existing.unitId },
        data: { status: 'AVAILABLE' },
      });
    }

    return success(res, serialize(tenant));
  }),
);

export default router;
