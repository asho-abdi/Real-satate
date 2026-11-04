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
import { logActivity } from '../../services/activity.service.js';

const router = Router();
router.use(authenticate);

const businessInclude = {
  unit: {
    include: {
      building: { select: { id: true, code: true, name: true } },
      floor: { select: { id: true, name: true, level: true } },
    },
  },
  payments: { orderBy: { month: 'desc' } },
};

function serialize(b) {
  if (!b) return b;
  return {
    ...b,
    monthlyRent: Number(b.monthlyRent),
    discount: Number(b.discount || 0),
    securityDeposit: Number(b.securityDeposit || 0),
    gracePeriodDays: Number(b.gracePeriodDays || 0),
    payments: (b.payments || []).map((p) => ({
      ...p,
      amountDue: Number(p.amountDue),
      amountPaid: Number(p.amountPaid),
    })),
  };
}

function freq(v) {
  const x = String(v || 'MONTHLY').toUpperCase();
  return ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(x) ? x : 'MONTHLY';
}

router.get(
  '/',
  authorize('businesses:read'),
  asyncHandler(async (req, res) => {
    const usageRaw = req.query.usage ? String(req.query.usage).toUpperCase() : null;
    const usage =
      usageRaw === 'SHOP' || usageRaw === 'OFFICE' ? usageRaw : null;
    const buildingFilter = unitBuildingFilter(req.user.buildingIds);
    const where = {
      deletedAt: null,
      ...buildingFilter,
    };
    if (usage) {
      where.unit = {
        ...(buildingFilter.unit || {}),
        usage,
        deletedAt: null,
      };
    }
    const data = await prisma.business.findMany({
      where,
      include: businessInclude,
      orderBy: { createdAt: 'desc' },
    });
    return success(res, data.map(serialize));
  }),
);

router.get(
  '/:id',
  authorize('businesses:read'),
  asyncHandler(async (req, res) => {
    const row = await prisma.business.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: businessInclude,
    });
    if (!row) throw new AppError('Business not found', 404);
    await assertUnitBuildingAccess(req.user, row.unitId, req.user.buildingIds);
    return success(res, serialize(row));
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
      identityDocument,
      identityDocumentName,
      unitId,
      monthlyRent,
      discount = 0,
      securityDeposit = 0,
      paymentFrequency = 'MONTHLY',
      gracePeriodDays = 0,
      notes,
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
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);
    if (unit.usage !== 'SHOP' && unit.usage !== 'OFFICE') {
      throw new AppError('Businesses can only be assigned to shop or office units', 400);
    }
    const expectedUsage = req.body?.expectedUsage
      ? String(req.body.expectedUsage).toUpperCase()
      : null;
    if (expectedUsage === 'SHOP' || expectedUsage === 'OFFICE') {
      if (unit.usage !== expectedUsage) {
        throw new AppError(
          `This unit is a ${unit.usage.toLowerCase()} and cannot be registered as a ${expectedUsage.toLowerCase()}`,
          400,
        );
      }
    }
    if (unit.status !== 'AVAILABLE') {
      throw new AppError(`Unit is ${unit.status.toLowerCase()} and cannot be rented`, 400);
    }

    const active = await prisma.business.findFirst({
      where: { unitId, status: 'ACTIVE', deletedAt: null },
    });
    if (active) {
      throw new AppError(
        `This ${unit.usage.toLowerCase()} already has an active lease`,
        409,
      );
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
          identityDocument: identityDocument ? String(identityDocument).trim() : null,
          identityDocumentName: identityDocumentName
            ? String(identityDocumentName).trim()
            : null,
          unitId,
          monthlyRent: rent,
          discount: disc,
          securityDeposit: Number(securityDeposit) || 0,
          paymentFrequency: freq(paymentFrequency),
          gracePeriodDays: Math.max(0, Number(gracePeriodDays) || 0),
          notes: notes ? String(notes).trim() : null,
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

      await logActivity({
        tx,
        entityType: 'BUSINESS',
        entityId: created.id,
        unitId,
        action: 'LEASE_CREATED',
        summary: `Lease created for ${created.businessName}`,
        meta: { leaseStart, leaseEnd: leaseEnd || null, monthlyRent: Number(rent) },
        actorId: req.user.id,
      });

      return created;
    });

    return success(res, serialize(business), 201);
  }),
);

router.post(
  '/:id/terminate',
  authorize('businesses:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.business.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Business not found', 404);
    if (existing.status !== 'ACTIVE') throw new AppError('Lease is not active', 400);
    await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);

    const {
      leaseEnd = new Date().toISOString().slice(0, 10),
      reason,
      notes,
      endNotes,
    } = req.body || {};
    const reasonText = reason || endNotes || notes || null;

    const business = await prisma.$transaction(async (tx) => {
      const updated = await tx.business.update({
        where: { id: existing.id },
        data: {
          status: 'ENDED',
          leaseEnd: new Date(leaseEnd),
          endedAt: new Date(),
          endReason: reasonText ? String(reasonText).trim() : null,
          ...(notes !== undefined && !reasonText
            ? { notes: notes ? String(notes).trim() : existing.notes }
            : {}),
        },
        include: businessInclude,
      });

      await tx.unit.update({
        where: { id: existing.unitId },
        data: { status: 'AVAILABLE' },
      });

      await logActivity({
        tx,
        entityType: 'BUSINESS',
        entityId: existing.id,
        unitId: existing.unitId,
        action: 'LEASE_TERMINATED',
        summary: `Lease terminated for ${existing.businessName}`,
        meta: { leaseEnd, reason: reasonText },
        actorId: req.user.id,
      });

      return updated;
    });

    return success(res, serialize(business));
  }),
);

router.post(
  '/:id/renew',
  authorize('businesses:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.business.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Business not found', 404);
    if (existing.status !== 'ACTIVE') throw new AppError('Only an active lease can be renewed', 400);
    await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);

    const {
      leaseStart,
      leaseEnd,
      monthlyRent,
      discount,
      securityDeposit,
      paymentFrequency,
      gracePeriodDays,
      notes,
    } = req.body || {};

    if (!leaseStart || !leaseEnd) {
      throw new AppError('leaseStart and leaseEnd are required for renewal', 400);
    }

    const rent = monthlyRent !== undefined ? Number(monthlyRent) : Number(existing.monthlyRent);
    const disc = discount !== undefined ? Number(discount) : Number(existing.discount);
    const amountDue = Math.max(0, rent - disc);
    const month = currentMonthKey(leaseStart);

    const renewed = await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: existing.id },
        data: {
          status: 'ENDED',
          leaseEnd: new Date(leaseStart),
          endedAt: new Date(),
          endReason: 'Renewed — replaced by new lease term',
        },
      });

      const created = await tx.business.create({
        data: {
          businessName: existing.businessName,
          contactName: existing.contactName,
          phone: existing.phone,
          licenseNumber: existing.licenseNumber,
          identityDocument: existing.identityDocument,
          identityDocumentName: existing.identityDocumentName,
          unitId: existing.unitId,
          monthlyRent: rent,
          discount: disc,
          securityDeposit:
            securityDeposit !== undefined
              ? Number(securityDeposit)
              : Number(existing.securityDeposit || 0),
          paymentFrequency: freq(paymentFrequency || existing.paymentFrequency),
          gracePeriodDays:
            gracePeriodDays !== undefined
              ? Math.max(0, Number(gracePeriodDays) || 0)
              : existing.gracePeriodDays || 0,
          notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
          leaseStart: new Date(leaseStart),
          leaseEnd: new Date(leaseEnd),
          status: 'ACTIVE',
        },
        include: businessInclude,
      });

      await tx.unit.update({
        where: { id: existing.unitId },
        data: { status: 'OCCUPIED' },
      });

      const existingMonth = await tx.monthlyPayment.findFirst({
        where: { businessId: created.id, month },
      });
      if (!existingMonth) {
        await tx.monthlyPayment.create({
          data: {
            businessId: created.id,
            month,
            amountDue,
            amountPaid: 0,
            status: 'UNPAID',
          },
        });
      }

      await logActivity({
        tx,
        entityType: 'BUSINESS',
        entityId: created.id,
        unitId: existing.unitId,
        action: 'LEASE_RENEWED',
        summary: `Lease renewed for ${existing.businessName}`,
        meta: {
          previousLeaseId: existing.id,
          leaseStart,
          leaseEnd,
          monthlyRent: rent,
        },
        actorId: req.user.id,
      });

      return created;
    });

    return success(res, serialize(renewed), 201);
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
    await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);

    const {
      businessName,
      contactName,
      phone,
      licenseNumber,
      identityDocument,
      identityDocumentName,
      monthlyRent,
      discount,
      securityDeposit,
      paymentFrequency,
      gracePeriodDays,
      notes,
      leaseStart,
      leaseEnd,
      status,
      endReason,
    } = req.body || {};

    const nextStatus = status !== undefined ? String(status).toUpperCase() : undefined;

    const business = await prisma.$transaction(async (tx) => {
      const updated = await tx.business.update({
        where: { id: existing.id },
        data: {
          ...(businessName !== undefined && { businessName: String(businessName).trim() }),
          ...(contactName !== undefined && { contactName: String(contactName).trim() }),
          ...(phone !== undefined && { phone: String(phone).trim() }),
          ...(licenseNumber !== undefined && { licenseNumber }),
          ...(identityDocument !== undefined && {
            identityDocument: identityDocument ? String(identityDocument).trim() : null,
          }),
          ...(identityDocumentName !== undefined && {
            identityDocumentName: identityDocumentName
              ? String(identityDocumentName).trim()
              : null,
          }),
          ...(monthlyRent !== undefined && { monthlyRent }),
          ...(discount !== undefined && { discount }),
          ...(securityDeposit !== undefined && { securityDeposit: Number(securityDeposit) || 0 }),
          ...(paymentFrequency !== undefined && { paymentFrequency: freq(paymentFrequency) }),
          ...(gracePeriodDays !== undefined && {
            gracePeriodDays: Math.max(0, Number(gracePeriodDays) || 0),
          }),
          ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
          ...(leaseStart !== undefined && { leaseStart: new Date(leaseStart) }),
          ...(leaseEnd !== undefined && { leaseEnd: leaseEnd ? new Date(leaseEnd) : null }),
          ...(nextStatus !== undefined && { status: nextStatus }),
          ...(nextStatus === 'ENDED' && {
            endedAt: new Date(),
            endReason: endReason ? String(endReason).trim() : existing.endReason,
          }),
        },
        include: businessInclude,
      });

      if (nextStatus === 'ENDED') {
        await tx.unit.update({
          where: { id: existing.unitId },
          data: { status: 'AVAILABLE' },
        });
        await logActivity({
          tx,
          entityType: 'BUSINESS',
          entityId: existing.id,
          unitId: existing.unitId,
          action: 'LEASE_TERMINATED',
          summary: `Lease ended for ${existing.businessName}`,
          meta: { endReason: endReason || null },
          actorId: req.user.id,
        });
      } else {
        await logActivity({
          tx,
          entityType: 'BUSINESS',
          entityId: existing.id,
          unitId: existing.unitId,
          action: 'LEASE_UPDATED',
          summary: `Lease details updated for ${updated.businessName}`,
          actorId: req.user.id,
        });
      }

      return updated;
    });

    return success(res, serialize(business));
  }),
);

export default router;
