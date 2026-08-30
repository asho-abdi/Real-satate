import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { dailyRent } from '../../utils/rent.js';

const router = Router();
router.use(authenticate);

function withDaily(unit) {
  if (!unit) return unit;
  return {
    ...unit,
    monthlyRent: Number(unit.monthlyRent),
    discount: Number(unit.discount),
    dailyRent: dailyRent(unit.monthlyRent),
  };
}

router.get(
  '/',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const { buildingId, floorId, status, usage, search } = req.query;
    const where = {
      deletedAt: null,
      building: { deletedAt: null },
      floor: { deletedAt: null },
      ...(buildingId ? { buildingId: String(buildingId) } : {}),
      ...(floorId ? { floorId: String(floorId) } : {}),
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(usage ? { usage: String(usage).toUpperCase() } : {}),
      ...(search
        ? {
            OR: [
              { roomNumber: { contains: String(search), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const units = await prisma.unit.findMany({
      where,
      include: {
        building: { select: { id: true, code: true, name: true } },
        floor: { select: { id: true, name: true, level: true } },
      },
      orderBy: [{ buildingId: 'asc' }, { roomNumber: 'asc' }],
    });
    return success(res, units.map(withDaily));
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
      discount = 0,
      status = 'AVAILABLE',
    } = req.body || {};

    if (!buildingId || !floorId || !roomNumber || !unitType || !usage || monthlyRent === undefined) {
      throw new AppError(
        'buildingId, floorId, roomNumber, unitType, usage, and monthlyRent are required',
        400,
      );
    }

    const building = await prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
    });
    if (!building) throw new AppError('Building not found', 404);

    const floor = await prisma.floor.findFirst({
      where: { id: floorId, deletedAt: null, buildingId },
    });
    if (!floor) throw new AppError('Floor not found for this building', 404);

    const unit = await prisma.unit.create({
      data: {
        buildingId,
        floorId,
        roomNumber: String(roomNumber).trim(),
        unitType: String(unitType).toUpperCase(),
        usage: String(usage).toUpperCase(),
        monthlyRent,
        discount,
        status: String(status).toUpperCase(),
      },
      include: {
        building: { select: { id: true, code: true, name: true } },
        floor: { select: { id: true, name: true, level: true } },
      },
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

    const {
      roomNumber,
      unitType,
      usage,
      monthlyRent,
      discount,
      status,
      floorId,
    } = req.body || {};

    const unit = await prisma.unit.update({
      where: { id: existing.id },
      data: {
        ...(roomNumber !== undefined && { roomNumber: String(roomNumber).trim() }),
        ...(unitType !== undefined && { unitType: String(unitType).toUpperCase() }),
        ...(usage !== undefined && { usage: String(usage).toUpperCase() }),
        ...(monthlyRent !== undefined && { monthlyRent }),
        ...(discount !== undefined && { discount }),
        ...(status !== undefined && { status: String(status).toUpperCase() }),
        ...(floorId !== undefined && { floorId }),
      },
      include: {
        building: { select: { id: true, code: true, name: true } },
        floor: { select: { id: true, name: true, level: true } },
      },
    });
    return success(res, withDaily(unit));
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
    await prisma.unit.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
