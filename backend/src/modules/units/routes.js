import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { uploadUnitImages } from '../../middlewares/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  assertBuildingAccess,
  assertUnitBuildingAccess,
  resourceBuildingFilter,
} from '../../services/access.service.js';

const router = Router();
router.use(authenticate);

const unitInclude = {
  building: {
    select: { id: true, code: true, name: true, address: true, transactionType: true },
  },
  floor: { select: { id: true, name: true, level: true } },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
};

function withDaily(unit) {
  if (!unit) return unit;
  const monthly = Number(unit.monthlyRent);
  const isGuest = unit.usage === 'GUEST';
  const daily = isGuest && unit.dailyRate != null ? Number(unit.dailyRate) : null;
  const weeklyStored = isGuest && unit.weeklyRent != null ? Number(unit.weeklyRent) : null;
  return {
    ...unit,
    monthlyRent: monthly,
    discount: Number(unit.discount),
    areaSqm: unit.areaSqm != null ? Number(unit.areaSqm) : null,
    roomsCount: unit.roomsCount ?? null,
    bathroomsCount: unit.bathroomsCount ?? null,
    salePrice: unit.salePrice != null ? Number(unit.salePrice) : null,
    weeklyRent: weeklyStored,
    dailyRate: isGuest && unit.dailyRate != null ? Number(unit.dailyRate) : null,
    dailyRent: daily,
    transactionType: unit.transactionType || unit.building?.transactionType || 'FOR_RENT',
  };
}

router.get(
  '/',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const {
      buildingId,
      floorId,
      status,
      usage,
      search,
      transactionType,
      minPrice,
      maxPrice,
    } = req.query;
    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }

    const where = {
      deletedAt: null,
      building: { deletedAt: null },
      floor: { deletedAt: null },
      ...(buildingId
        ? { buildingId: String(buildingId) }
        : resourceBuildingFilter(req.user.buildingIds)),
      ...(floorId ? { floorId: String(floorId) } : {}),
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(usage ? { usage: String(usage).toUpperCase() } : {}),
      ...(transactionType
        ? { transactionType: String(transactionType).toUpperCase() }
        : {}),
      ...(minPrice || maxPrice
        ? {
            monthlyRent: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { roomNumber: { contains: String(search), mode: 'insensitive' } },
              { description: { contains: String(search), mode: 'insensitive' } },
              { building: { name: { contains: String(search), mode: 'insensitive' } } },
              { building: { address: { contains: String(search), mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const units = await prisma.unit.findMany({
      where,
      include: unitInclude,
      orderBy: [{ buildingId: 'asc' }, { roomNumber: 'asc' }],
    });
    return success(res, units.map(withDaily));
  }),
);

router.get(
  '/:id',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: unitInclude,
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);
    return success(res, withDaily(unit));
  }),
);

router.get(
  '/:id/financials',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);

    const [bookings, tenantPayments, businessPayments, expenses] = await Promise.all([
      prisma.booking.findMany({
        where: { unitId: unit.id, deletedAt: null, status: { not: 'CANCELLED' } },
        select: {
          id: true,
          code: true,
          fullName: true,
          totalAmount: true,
          amountPaid: true,
          checkIn: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.monthlyPayment.findMany({
        where: { tenant: { unitId: unit.id, deletedAt: null } },
        select: {
          id: true,
          month: true,
          amountPaid: true,
          paymentDate: true,
          createdAt: true,
          tenant: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.monthlyPayment.findMany({
        where: { business: { unitId: unit.id, deletedAt: null } },
        select: {
          id: true,
          month: true,
          amountPaid: true,
          paymentDate: true,
          createdAt: true,
          business: { select: { businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.expense.findMany({
        where: { unitId: unit.id, deletedAt: null },
        select: {
          id: true,
          code: true,
          category: true,
          amount: true,
          expenseDate: true,
          comment: true,
        },
        orderBy: { expenseDate: 'desc' },
        take: 50,
      }),
    ]);

    const rentalIncome =
      bookings.reduce((s, b) => s + Number(b.amountPaid || 0), 0) +
      tenantPayments.reduce((s, p) => s + Number(p.amountPaid || 0), 0) +
      businessPayments.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const transactions = [
      ...bookings.map((b) => ({
        id: `bk-${b.id}`,
        date: b.checkIn || b.createdAt,
        type: 'Rental',
        description: `Guest booking ${b.code} · ${b.fullName}`,
        amount: Number(b.amountPaid || 0),
      })),
      ...tenantPayments
        .filter((p) => Number(p.amountPaid) > 0)
        .map((p) => ({
          id: `tp-${p.id}`,
          date: p.paymentDate || p.createdAt,
          type: 'Rental',
          description: `Apartment rent ${p.month} · ${p.tenant?.fullName || ''}`,
          amount: Number(p.amountPaid || 0),
        })),
      ...businessPayments
        .filter((p) => Number(p.amountPaid) > 0)
        .map((p) => ({
          id: `bp-${p.id}`,
          date: p.paymentDate || p.createdAt,
          type: 'Rental',
          description: `Shop rent ${p.month} · ${p.business?.businessName || ''}`,
          amount: Number(p.amountPaid || 0),
        })),
      ...expenses.map((e) => ({
        id: `ex-${e.id}`,
        date: e.expenseDate,
        type: 'Expense',
        description: `${e.category}: ${e.comment}`,
        amount: -Number(e.amount || 0),
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return success(res, {
      unitId: unit.id,
      roomNumber: unit.roomNumber,
      rentalIncome,
      expenses: expenseTotal,
      netIncome: rentalIncome - expenseTotal,
      transactions: transactions.slice(0, 40),
    });
  }),
);

router.post(
  '/',
  authorize('units:create'),
  asyncHandler(async (req, res) => {
    const {
      buildingId,
      floorId,
      roomNumber,
      unitType,
      usage,
      monthlyRent,
      weeklyRent: weeklyRentIn,
      dailyRate,
      salePrice,
      discount = 0,
      status = 'AVAILABLE',
      transactionType,
      areaSqm,
      roomsCount,
      bathroomsCount,
      description,
      notes,
    } = req.body || {};

    if (!buildingId || !floorId || !roomNumber || !unitType || !usage || monthlyRent === undefined) {
      throw new AppError(
        'buildingId, floorId, roomNumber, unitType, usage, and monthlyRent are required',
        400,
      );
    }

    await assertBuildingAccess(req.user, buildingId, req.user.buildingIds);

    const building = await prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
    });
    if (!building) throw new AppError('Building not found', 404);

    const floor = await prisma.floor.findFirst({
      where: { id: floorId, deletedAt: null, buildingId },
    });
    if (!floor) throw new AppError('Floor not found for this building', 404);

    const usageUpper = String(usage).toUpperCase();
    const txType = transactionType
      ? String(transactionType).toUpperCase()
      : building.transactionType || 'FOR_RENT';

    const unit = await prisma.unit.create({
      data: {
        buildingId,
        floorId,
        roomNumber: String(roomNumber).trim(),
        unitType: String(unitType).toUpperCase(),
        usage: usageUpper,
        transactionType: txType,
        monthlyRent,
        weeklyRent:
          usageUpper === 'GUEST' && weeklyRentIn !== undefined && weeklyRentIn !== ''
            ? Number(weeklyRentIn)
            : null,
        dailyRate:
          usageUpper === 'GUEST' && dailyRate !== undefined && dailyRate !== ''
            ? Number(dailyRate)
            : null,
        salePrice: salePrice !== undefined && salePrice !== '' ? Number(salePrice) : null,
        discount,
        status: String(status).toUpperCase(),
        description: description ? String(description).trim() : null,
        notes: notes ? String(notes).trim() : null,
        areaSqm:
          (usageUpper === 'SHOP' || usageUpper === 'OFFICE') &&
          areaSqm !== undefined &&
          areaSqm !== ''
            ? Number(areaSqm)
            : null,
        roomsCount:
          usageUpper === 'APARTMENT' && roomsCount !== undefined && roomsCount !== ''
            ? Number(roomsCount)
            : null,
        bathroomsCount:
          usageUpper === 'APARTMENT' && bathroomsCount !== undefined && bathroomsCount !== ''
            ? Number(bathroomsCount)
            : null,
      },
      include: unitInclude,
    });
    return success(res, withDaily(unit), 201);
  }),
);

router.patch(
  '/:id',
  authorize('units:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, existing.id, req.user.buildingIds);

    const {
      roomNumber,
      unitType,
      usage,
      monthlyRent,
      weeklyRent: weeklyRentIn,
      dailyRate,
      salePrice,
      discount,
      status,
      floorId,
      areaSqm,
      roomsCount,
      bathroomsCount,
      transactionType,
      description,
      notes,
    } = req.body || {};

    const nextUsage = usage !== undefined ? String(usage).toUpperCase() : existing.usage;

    const unit = await prisma.unit.update({
      where: { id: existing.id },
      data: {
        ...(roomNumber !== undefined && { roomNumber: String(roomNumber).trim() }),
        ...(unitType !== undefined && { unitType: String(unitType).toUpperCase() }),
        ...(usage !== undefined && { usage: nextUsage }),
        ...(monthlyRent !== undefined && { monthlyRent }),
        ...(nextUsage !== 'GUEST'
          ? { weeklyRent: null, dailyRate: null }
          : {
              ...(weeklyRentIn !== undefined && {
                weeklyRent:
                  weeklyRentIn === '' || weeklyRentIn === null ? null : Number(weeklyRentIn),
              }),
              ...(dailyRate !== undefined && {
                dailyRate: dailyRate === '' || dailyRate === null ? null : Number(dailyRate),
              }),
            }),
        ...(salePrice !== undefined && {
          salePrice: salePrice === '' || salePrice === null ? null : Number(salePrice),
        }),
        ...(discount !== undefined && { discount }),
        ...(status !== undefined && { status: String(status).toUpperCase() }),
        ...(transactionType !== undefined && {
          transactionType: String(transactionType).toUpperCase(),
        }),
        ...(floorId !== undefined && { floorId }),
        ...(description !== undefined && {
          description: description ? String(description).trim() : null,
        }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        ...(areaSqm !== undefined && {
          areaSqm: areaSqm === '' || areaSqm === null ? null : Number(areaSqm),
        }),
        ...(roomsCount !== undefined && {
          roomsCount: roomsCount === '' || roomsCount === null ? null : Number(roomsCount),
        }),
        ...(bathroomsCount !== undefined && {
          bathroomsCount:
            bathroomsCount === '' || bathroomsCount === null ? null : Number(bathroomsCount),
        }),
      },
      include: unitInclude,
    });
    return success(res, withDaily(unit));
  }),
);

router.post(
  '/:id/images',
  authorize('units:update'),
  uploadUnitImages.array('images', 20),
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);

    const files = req.files || [];
    if (!files.length) throw new AppError('At least one image is required', 400);

    const existingCount = await prisma.unitImage.count({ where: { unitId: unit.id } });
    const created = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const image = await prisma.unitImage.create({
        data: {
          unitId: unit.id,
          filename: file.filename,
          originalName: file.originalname,
          url: `/api/v1/files/units/${file.filename}`,
          isPrimary: existingCount === 0 && i === 0,
          sortOrder: existingCount + i,
        },
      });
      created.push(image);
    }

    return success(res, created, 201);
  }),
);

router.patch(
  '/:id/images/:imageId/primary',
  authorize('units:update'),
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);

    const image = await prisma.unitImage.findFirst({
      where: { id: req.params.imageId, unitId: unit.id },
    });
    if (!image) throw new AppError('Image not found', 404);

    await prisma.$transaction([
      prisma.unitImage.updateMany({ where: { unitId: unit.id }, data: { isPrimary: false } }),
      prisma.unitImage.update({ where: { id: image.id }, data: { isPrimary: true } }),
    ]);

    return success(res, { ...image, isPrimary: true });
  }),
);

router.delete(
  '/:id/images/:imageId',
  authorize('units:update'),
  asyncHandler(async (req, res) => {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!unit) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);

    const image = await prisma.unitImage.findFirst({
      where: { id: req.params.imageId, unitId: unit.id },
    });
    if (!image) throw new AppError('Image not found', 404);

    await prisma.unitImage.delete({ where: { id: image.id } });

    if (image.isPrimary) {
      const next = await prisma.unitImage.findFirst({
        where: { unitId: unit.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      if (next) {
        await prisma.unitImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    return success(res, { id: image.id, deleted: true });
  }),
);

router.delete(
  '/:id',
  authorize('units:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.unit.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Unit not found', 404);
    await assertUnitBuildingAccess(req.user, existing.id, req.user.buildingIds);
    await prisma.unit.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
