import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('buildings:read'),
  asyncHandler(async (_req, res) => {
    const data = await prisma.building.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            floors: { where: { deletedAt: null } },
            units: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
    return success(res, data);
  }),
);

router.get(
  '/:id',
  authorize('buildings:read'),
  asyncHandler(async (req, res) => {
    const building = await prisma.building.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        floors: { where: { deletedAt: null }, orderBy: { level: 'asc' } },
        units: { where: { deletedAt: null }, orderBy: { roomNumber: 'asc' } },
      },
    });
    if (!building) throw new AppError('Building not found', 404);
    return success(res, building);
  }),
);

router.post(
  '/',
  authorize('buildings:create'),
  asyncHandler(async (req, res) => {
    const { code, name, address, floorsCount, notes } = req.body || {};
    if (!code || !name) throw new AppError('code and name are required', 400);
    const building = await prisma.building.create({
      data: {
        code: String(code).trim(),
        name: String(name).trim(),
        address: address || null,
        floorsCount: Number(floorsCount) || 0,
        notes: notes || null,
      },
    });
    return success(res, building, 201);
  }),
);

router.patch(
  '/:id',
  authorize('buildings:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.building.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Building not found', 404);

    const { code, name, address, floorsCount, notes } = req.body || {};
    const building = await prisma.building.update({
      where: { id: existing.id },
      data: {
        ...(code !== undefined && { code: String(code).trim() }),
        ...(name !== undefined && { name: String(name).trim() }),
        ...(address !== undefined && { address }),
        ...(floorsCount !== undefined && { floorsCount: Number(floorsCount) }),
        ...(notes !== undefined && { notes }),
      },
    });
    return success(res, building);
  }),
);

router.delete(
  '/:id',
  authorize('buildings:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.building.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Building not found', 404);
    await prisma.building.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    await prisma.floor.updateMany({
      where: { buildingId: existing.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await prisma.unit.updateMany({
      where: { buildingId: existing.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
