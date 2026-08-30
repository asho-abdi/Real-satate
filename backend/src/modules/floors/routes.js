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
  authorize('floors:read'),
  asyncHandler(async (req, res) => {
    const { buildingId } = req.query;
    const data = await prisma.floor.findMany({
      where: {
        deletedAt: null,
        building: { deletedAt: null },
        ...(buildingId ? { buildingId: String(buildingId) } : {}),
      },
      include: { building: { select: { id: true, code: true, name: true } } },
      orderBy: [{ buildingId: 'asc' }, { level: 'asc' }],
    });
    return success(res, data);
  }),
);

router.post(
  '/',
  authorize('floors:create'),
  asyncHandler(async (req, res) => {
    const { buildingId, name, level } = req.body || {};
    if (!buildingId || !name || level === undefined) {
      throw new AppError('buildingId, name, and level are required', 400);
    }
    const building = await prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
    });
    if (!building) throw new AppError('Building not found', 404);

    const floor = await prisma.floor.create({
      data: {
        buildingId,
        name: String(name).trim(),
        level: Number(level),
      },
    });
    return success(res, floor, 201);
  }),
);

router.patch(
  '/:id',
  authorize('floors:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.floor.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Floor not found', 404);

    const { name, level } = req.body || {};
    const floor = await prisma.floor.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(level !== undefined && { level: Number(level) }),
      },
    });
    return success(res, floor);
  }),
);

router.delete(
  '/:id',
  authorize('floors:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.floor.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Floor not found', 404);
    await prisma.floor.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
