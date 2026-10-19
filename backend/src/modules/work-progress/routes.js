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

const workInclude = {
  building: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, roomNumber: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

function serialize(w) {
  if (!w) return w;
  return {
    ...w,
    budget: w.budget != null ? Number(w.budget) : null,
    actualExpense: w.actualExpense != null ? Number(w.actualExpense) : null,
    progressPercent: Number(w.progressPercent) || 0,
    createdByName: w.createdBy
      ? `${w.createdBy.firstName || ''} ${w.createdBy.lastName || ''}`.trim() || w.createdBy.email
      : null,
  };
}

router.get(
  '/',
  authorize('work:read'),
  asyncHandler(async (req, res) => {
    const { buildingId, unitId, status, active } = req.query;
    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }

    const where = {
      deletedAt: null,
      ...(buildingId
        ? { buildingId: String(buildingId) }
        : resourceBuildingFilter(req.user.buildingIds)),
      ...(unitId ? { unitId: String(unitId) } : {}),
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(String(active) === 'true'
        ? { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD'] } }
        : {}),
    };

    const rows = await prisma.workProgress.findMany({
      where,
      include: workInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return success(res, rows.map(serialize));
  }),
);

router.get(
  '/summary',
  authorize('work:read'),
  asyncHandler(async (req, res) => {
    const buildingFilter = resourceBuildingFilter(req.user.buildingIds);
    const base = { deletedAt: null, ...buildingFilter };

    const [active, completed, pending, maintenanceCost] = await Promise.all([
      prisma.workProgress.count({
        where: { ...base, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD'] } },
      }),
      prisma.workProgress.count({ where: { ...base, status: 'COMPLETED' } }),
      prisma.workProgress.count({
        where: { ...base, status: { in: ['NOT_STARTED', 'ON_HOLD'] } },
      }),
      prisma.workProgress.aggregate({
        where: base,
        _sum: { actualExpense: true },
      }),
    ]);

    const activeItems = await prisma.workProgress.findMany({
      where: { ...base, status: { in: ['IN_PROGRESS', 'NOT_STARTED', 'ON_HOLD'] } },
      include: workInclude,
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });

    return success(res, {
      active,
      completed,
      pending,
      totalMaintenanceExpense: Number(maintenanceCost._sum.actualExpense || 0),
      activeItems: activeItems.map(serialize),
    });
  }),
);

router.post(
  '/',
  authorize('work:create'),
  uploadUnitImages.single('image'),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const {
      buildingId,
      unitId,
      title,
      description,
      assignedTo,
      startDate,
      expectedEndDate,
      progressPercent = 0,
      status = 'NOT_STARTED',
      budget,
      actualExpense,
      notes,
    } = body;

    if (!buildingId || !title) {
      throw new AppError('buildingId and title are required', 400);
    }

    await assertBuildingAccess(req.user, buildingId, req.user.buildingIds);
    if (unitId) {
      await assertUnitBuildingAccess(req.user, unitId, req.user.buildingIds);
    }

    let imageFilename = null;
    let imageUrl = null;
    if (req.file) {
      imageFilename = req.file.filename;
      imageUrl = `/api/v1/files/units/${req.file.filename}`;
    }

    const created = await prisma.workProgress.create({
      data: {
        buildingId,
        unitId: unitId || null,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        assignedTo: assignedTo ? String(assignedTo).trim() : null,
        startDate: startDate ? new Date(startDate) : null,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
        progressPercent: Math.min(100, Math.max(0, Number(progressPercent) || 0)),
        status: String(status).toUpperCase(),
        budget: budget !== undefined && budget !== '' ? Number(budget) : null,
        actualExpense:
          actualExpense !== undefined && actualExpense !== '' ? Number(actualExpense) : null,
        notes: notes ? String(notes).trim() : null,
        imageFilename,
        imageUrl,
        createdById: req.user.id || null,
      },
      include: workInclude,
    });

    return success(res, serialize(created), 201);
  }),
);

router.patch(
  '/:id',
  authorize('work:update'),
  uploadUnitImages.single('image'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workProgress.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Work progress not found', 404);
    await assertBuildingAccess(req.user, existing.buildingId, req.user.buildingIds);

    const body = req.body || {};
    const data = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.assignedTo !== undefined) {
      data.assignedTo = body.assignedTo ? String(body.assignedTo).trim() : null;
    }
    if (body.startDate !== undefined) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.expectedEndDate !== undefined) {
      data.expectedEndDate = body.expectedEndDate ? new Date(body.expectedEndDate) : null;
    }
    if (body.progressPercent !== undefined) {
      data.progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent) || 0));
    }
    if (body.status !== undefined) data.status = String(body.status).toUpperCase();
    if (body.budget !== undefined) {
      data.budget = body.budget === '' || body.budget === null ? null : Number(body.budget);
    }
    if (body.actualExpense !== undefined) {
      data.actualExpense =
        body.actualExpense === '' || body.actualExpense === null
          ? null
          : Number(body.actualExpense);
    }
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;
    if (body.unitId !== undefined) data.unitId = body.unitId || null;

    if (req.file) {
      data.imageFilename = req.file.filename;
      data.imageUrl = `/api/v1/files/units/${req.file.filename}`;
    }

    const updated = await prisma.workProgress.update({
      where: { id: existing.id },
      data,
      include: workInclude,
    });
    return success(res, serialize(updated));
  }),
);

router.delete(
  '/:id',
  authorize('work:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workProgress.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Work progress not found', 404);
    await assertBuildingAccess(req.user, existing.buildingId, req.user.buildingIds);

    await prisma.workProgress.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
