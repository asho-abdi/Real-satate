import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { uploadUnitImages } from '../../middlewares/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { assertBuildingAccess } from '../../services/access.service.js';

const router = Router();
router.use(authenticate);

const SECTION_TEMPLATES = {
  suppliers: {
    name: 'Suppliers',
    key: 'suppliers',
    fieldSchema: [
      { key: 'name', label: 'Supplier name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  workers: {
    name: 'Workers',
    key: 'workers',
    fieldSchema: [
      { key: 'name', label: 'Worker name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'role', label: 'Job / role', type: 'text' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'monthlyPayment', label: 'Monthly payment', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  inventory: {
    name: 'Inventory',
    key: 'inventory',
    fieldSchema: [
      { key: 'item', label: 'Item', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
      { key: 'unitPrice', label: 'Unit price', type: 'number' },
      { key: 'total', label: 'Total', type: 'number' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'purchaseDate', label: 'Purchase date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  expenses: {
    name: 'Expenses',
    key: 'expenses',
    fieldSchema: [
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'paidTo', label: 'Paid to', type: 'text' },
      { key: 'reference', label: 'Reference / comment', type: 'textarea' },
    ],
  },
  worker_payments: {
    name: 'Worker Payments',
    key: 'worker_payments',
    fieldSchema: [
      { key: 'workerName', label: 'Worker', type: 'text' },
      { key: 'period', label: 'Period', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
};

const projectInclude = {
  building: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  sections: {
    orderBy: { sortOrder: 'asc' },
    include: {
      records: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
    },
  },
};

function serializeProject(p) {
  if (!p) return p;
  return {
    ...p,
    budget: p.budget != null ? Number(p.budget) : null,
    createdByName: p.createdBy
      ? `${p.createdBy.firstName || ''} ${p.createdBy.lastName || ''}`.trim() || p.createdBy.email
      : null,
    sections: (p.sections || []).map((s) => ({
      ...s,
      fieldSchema: Array.isArray(s.fieldSchema) ? s.fieldSchema : s.fieldSchema,
      records: (s.records || []).map((r) => ({
        ...r,
        data: r.data || {},
      })),
    })),
  };
}

router.get(
  '/templates',
  authorize('work:read'),
  asyncHandler(async (_req, res) => {
    return success(res, Object.values(SECTION_TEMPLATES));
  }),
);

router.get(
  '/',
  authorize('work:read'),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const rows = await prisma.workProject.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: String(status).toUpperCase() } : {}),
      },
      include: {
        building: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return success(
      res,
      rows.map((p) => ({
        ...p,
        budget: p.budget != null ? Number(p.budget) : null,
      })),
    );
  }),
);

router.get(
  '/summary',
  authorize('work:read'),
  asyncHandler(async (_req, res) => {
    const base = { deletedAt: null };
    const [planning, inProgress, onHold, completed, recent] = await Promise.all([
      prisma.workProject.count({ where: { ...base, status: 'PLANNING' } }),
      prisma.workProject.count({ where: { ...base, status: 'IN_PROGRESS' } }),
      prisma.workProject.count({ where: { ...base, status: 'ON_HOLD' } }),
      prisma.workProject.count({ where: { ...base, status: 'COMPLETED' } }),
      prisma.workProject.findMany({
        where: base,
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: { building: { select: { name: true } } },
      }),
    ]);
    return success(res, {
      planning,
      inProgress,
      onHold,
      completed,
      active: planning + inProgress + onHold,
      recent: recent.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        building: p.building?.name || null,
        updatedAt: p.updatedAt,
      })),
    });
  }),
);

router.get(
  '/:id',
  authorize('work:read'),
  asyncHandler(async (req, res) => {
    const project = await prisma.workProject.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: projectInclude,
    });
    if (!project) throw new AppError('Project not found', 404);
    return success(res, serializeProject(project));
  }),
);

router.post(
  '/',
  authorize('work:create'),
  uploadUnitImages.single('image'),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const {
      name,
      description,
      buildingId,
      startDate,
      expectedEndDate,
      status = 'PLANNING',
      budget,
      notes,
      templates,
    } = body;

    if (!name || !String(name).trim()) throw new AppError('Project name is required', 400);
    if (buildingId) {
      await assertBuildingAccess(req.user, buildingId, req.user.buildingIds);
    }

    let imageFilename = null;
    let imageUrl = null;
    if (req.file) {
      imageFilename = req.file.filename;
      imageUrl = `/api/v1/files/units/${req.file.filename}`;
    }

    const templateKeys = String(templates || 'suppliers,workers,inventory,expenses')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.workProject.create({
        data: {
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          buildingId: buildingId || null,
          startDate: startDate ? new Date(startDate) : null,
          expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
          status: String(status).toUpperCase(),
          budget: budget !== undefined && budget !== '' ? Number(budget) : null,
          notes: notes ? String(notes).trim() : null,
          imageFilename,
          imageUrl,
          createdById: req.user.id || null,
        },
      });

      let order = 0;
      for (const key of templateKeys) {
        const tpl = SECTION_TEMPLATES[key];
        if (!tpl) continue;
        await tx.workSection.create({
          data: {
            projectId: project.id,
            name: tpl.name,
            key: tpl.key,
            fieldSchema: tpl.fieldSchema,
            sortOrder: order,
          },
        });
        order += 1;
      }

      return tx.workProject.findFirst({
        where: { id: project.id },
        include: projectInclude,
      });
    });

    return success(res, serializeProject(created), 201);
  }),
);

router.patch(
  '/:id',
  authorize('work:update'),
  uploadUnitImages.single('image'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workProject.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Project not found', 404);

    const body = req.body || {};
    const data = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.buildingId !== undefined) data.buildingId = body.buildingId || null;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.expectedEndDate !== undefined) {
      data.expectedEndDate = body.expectedEndDate ? new Date(body.expectedEndDate) : null;
    }
    if (body.status !== undefined) data.status = String(body.status).toUpperCase();
    if (body.budget !== undefined) {
      data.budget = body.budget === '' || body.budget === null ? null : Number(body.budget);
    }
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;
    if (req.file) {
      data.imageFilename = req.file.filename;
      data.imageUrl = `/api/v1/files/units/${req.file.filename}`;
    }

    await prisma.workProject.update({ where: { id: existing.id }, data });
    const project = await prisma.workProject.findFirst({
      where: { id: existing.id },
      include: projectInclude,
    });
    return success(res, serializeProject(project));
  }),
);

router.delete(
  '/:id',
  authorize('work:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workProject.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Project not found', 404);
    await prisma.workProject.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

router.post(
  '/:id/sections',
  authorize('work:update'),
  asyncHandler(async (req, res) => {
    const project = await prisma.workProject.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!project) throw new AppError('Project not found', 404);

    const { name, key, fieldSchema, template } = req.body || {};
    let schema = fieldSchema;
    let sectionName = name;
    let sectionKey = key || null;

    if (template && SECTION_TEMPLATES[template]) {
      const tpl = SECTION_TEMPLATES[template];
      sectionName = sectionName || tpl.name;
      sectionKey = tpl.key;
      schema = tpl.fieldSchema;
    }

    if (!sectionName) throw new AppError('Section name is required', 400);
    if (!Array.isArray(schema) || !schema.length) {
      schema = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'amount', label: 'Amount', type: 'number' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ];
    }

    const maxOrder = await prisma.workSection.aggregate({
      where: { projectId: project.id },
      _max: { sortOrder: true },
    });

    const section = await prisma.workSection.create({
      data: {
        projectId: project.id,
        name: String(sectionName).trim(),
        key: sectionKey,
        fieldSchema: schema,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { records: true },
    });

    return success(res, section, 201);
  }),
);

router.post(
  '/sections/:sectionId/records',
  authorize('work:update'),
  asyncHandler(async (req, res) => {
    const section = await prisma.workSection.findFirst({
      where: { id: req.params.sectionId },
      include: { project: true },
    });
    if (!section || section.project.deletedAt) throw new AppError('Section not found', 404);

    const data = req.body?.data || req.body || {};
    const record = await prisma.workRecord.create({
      data: {
        sectionId: section.id,
        data,
        createdById: req.user.id || null,
      },
    });
    return success(res, record, 201);
  }),
);

router.patch(
  '/records/:recordId',
  authorize('work:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workRecord.findFirst({
      where: { id: req.params.recordId, deletedAt: null },
    });
    if (!existing) throw new AppError('Record not found', 404);
    const data = req.body?.data || req.body || {};
    const updated = await prisma.workRecord.update({
      where: { id: existing.id },
      data: { data },
    });
    return success(res, updated);
  }),
);

router.delete(
  '/records/:recordId',
  authorize('work:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.workRecord.findFirst({
      where: { id: req.params.recordId, deletedAt: null },
    });
    if (!existing) throw new AppError('Record not found', 404);
    await prisma.workRecord.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
