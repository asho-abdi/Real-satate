import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  assertBuildingAccess,
  assertFloorBuildingAccess,
  resourceBuildingFilter,
} from '../../services/access.service.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('floors:read'),
  asyncHandler(async (req, res) => {
    const { buildingId } = req.query;
    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }

    const data = await prisma.floor.findMany({
      where: {
        deletedAt: null,
        building: { deletedAt: null },
        ...(buildingId
          ? { buildingId: String(buildingId) }
          : resourceBuildingFilter(req.user.buildingIds)),
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
    await assertBuildingAccess(req.user, buildingId, req.user.buildingIds);

    const building = await prisma.building.findFirst({
      where: { id: buildingId, deletedAt: null },
    });
    if (!building) throw new AppError('Building not found', 404);

    const nextLevel = Number(level);
    if (!Number.isFinite(nextLevel)) {
      throw new AppError('level must be a number', 400);
    }

    const existingActive = await prisma.floor.findFirst({
      where: { buildingId, level: nextLevel, deletedAt: null },
    });
    if (existingActive) {
      throw new AppError(`A floor at level ${nextLevel} already exists for this building`, 409);
    }

    // Soft-deleted floors used to block recreate via unique(buildingId, level).
    // Restore + rename instead of leaving a dead row in the way.
    const softDeleted = await prisma.floor.findFirst({
      where: { buildingId, level: nextLevel, deletedAt: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
    if (softDeleted) {
      const floor = await prisma.floor.update({
        where: { id: softDeleted.id },
        data: {
          name: String(name).trim(),
          deletedAt: null,
        },
      });
      const activeCount = await prisma.floor.count({
        where: { buildingId, deletedAt: null },
      });
      await prisma.building.update({
        where: { id: buildingId },
        data: { floorsCount: activeCount },
      });
      return success(res, floor, 201);
    }

    const floor = await prisma.floor.create({
      data: {
        buildingId,
        name: String(name).trim(),
        level: nextLevel,
      },
    });
    const activeCount = await prisma.floor.count({
      where: { buildingId, deletedAt: null },
    });
    await prisma.building.update({
      where: { id: buildingId },
      data: { floorsCount: activeCount },
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
    await assertFloorBuildingAccess(req.user, existing.id, req.user.buildingIds);

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
    await assertFloorBuildingAccess(req.user, existing.id, req.user.buildingIds);
    await prisma.floor.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    const activeCount = await prisma.floor.count({
      where: { buildingId: existing.buildingId, deletedAt: null },
    });
    await prisma.building.update({
      where: { id: existing.buildingId },
      data: { floorsCount: activeCount },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
