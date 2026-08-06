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

const businessInclude = {
  unit: {
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
  },
};

function serialize(b) {
  if (!b) return b;
  return {
    ...b,
    monthlyRent: Number(b.monthlyRent),
    discount: Number(b.discount),
  };
}

router.get(
  '/',
  authorize('businesses:read'),
  asyncHandler(async (_req, res) => {
    const data = await prisma.business.findMany({
      where: { deletedAt: null },
      include: businessInclude,
      orderBy: { createdAt: 'desc' },
    });
    return success(res, data.map(serialize));
  }),
);

router.post(
  '/',
  authorize('businesses:create'),
  asyncHandler(async (req, res) => {
    const {
      businessName,
      contactName,
      phone,
      licenseNumber,
      unitId,
      monthlyRent,
      discount = 0,
      leaseStart,
      leaseEnd,
    } = req.body || {};

    if (!businessName || !contactName || !phone || !unitId || !leaseStart) {
      throw new AppError(
        'businessName, contactName, phone, unitId, and leaseStart are required',
        400,
      );
    }

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    if (unit.usage !== 'SHOP') {
      throw new AppError('Businesses can only be assigned to shop units', 400);
    }
    if (unit.status !== 'AVAILABLE') {
      throw new AppError(`Unit is ${unit.status.toLowerCase()} and cannot be rented`, 400);
    }

    const rent = monthlyRent !== undefined ? monthlyRent : unit.monthlyRent;
    const disc = discount !== undefined ? discount : unit.discount;
    const amountDue = Math.max(0, Number(rent) - Number(disc));
    const month = currentMonthKey();

    const business = await prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          businessName: String(businessName).trim(),
          contactName: String(contactName).trim(),
          phone: String(phone).trim(),
          licenseNumber: licenseNumber || null,
          unitId,
          monthlyRent: rent,
          discount: disc,
          leaseStart: new Date(leaseStart),
          leaseEnd: leaseEnd ? new Date(leaseEnd) : null,
          status: 'ACTIVE',
        },
        include: businessInclude,
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { status: 'OCCUPIED' },
      });

      await tx.monthlyPayment.create({
        data: {
          businessId: created.id,
          month,
          amountDue,
          amountPaid: 0,
          status: 'UNPAID',
        },
      });

      return created;
    });

    return success(res, serialize(business), 201);
  }),
);

router.patch(
  '/:id',
  authorize('businesses:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.business.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Business not found', 404);

    const {
      businessName,
      contactName,
      phone,
      licenseNumber,
      monthlyRent,
      discount,
      leaseStart,
      leaseEnd,
      status,
    } = req.body || {};

    const business = await prisma.business.update({
      where: { id: existing.id },
      data: {
        ...(businessName !== undefined && { businessName: String(businessName).trim() }),
        ...(contactName !== undefined && { contactName: String(contactName).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(monthlyRent !== undefined && { monthlyRent }),
        ...(discount !== undefined && { discount }),
        ...(leaseStart !== undefined && { leaseStart: new Date(leaseStart) }),
        ...(leaseEnd !== undefined && { leaseEnd: leaseEnd ? new Date(leaseEnd) : null }),
        ...(status !== undefined && { status: String(status).toUpperCase() }),
      },
      include: businessInclude,
    });

    if (status && String(status).toUpperCase() === 'ENDED') {
      await prisma.unit.update({
        where: { id: existing.unitId },
        data: { status: 'AVAILABLE' },
      });
    }

    return success(res, serialize(business));
  }),
);

export default router;
