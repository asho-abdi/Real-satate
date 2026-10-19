import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  assertBuildingAccess,
  assertUnitBuildingAccess,
} from '../../services/access.service.js';
import { logActivity } from '../../services/activity.service.js';

const router = Router();
router.use(authenticate);

const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea'];

const recordInclude = {
  building: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, roomNumber: true, usage: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  expense: { select: { id: true, code: true, amount: true, deletedAt: true } },
};

function money(v) {
  return Number(v || 0);
}

function serialize(row) {
  if (!row) return row;
  return {
    ...row,
    amount: money(row.amount),
    customData: row.customData && typeof row.customData === 'object' ? row.customData : {},
    createdByName: row.createdBy
      ? `${row.createdBy.firstName || ''} ${row.createdBy.lastName || ''}`.trim() ||
        row.createdBy.email
      : null,
  };
}

function buildingScope(buildingIds) {
  if (buildingIds === null) return {};
  return { buildingId: { in: buildingIds } };
}

async function nextMaintCode(tx = prisma) {
  const latest = await tx.maintenanceRecord.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  const match = latest?.code?.match(/(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1001;
  return `MNT-${next}`;
}

async function nextExpenseCode(tx = prisma) {
  const latest = await tx.expense.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  const match = latest?.code?.match(/(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1001;
  return `TXN-${next}`;
}

/** Non-cancelled maintenance with a cost posts to Expense (MAINTENANCE). */
function shouldPostExpense(status, amount) {
  return status !== 'CANCELLED' && Number(amount) > 0;
}

async function syncExpense(tx, {
  existingExpenseId,
  subject,
  amount,
  buildingId,
  unitId,
  workDate,
  description,
  status,
  createdById,
}) {
  if (!shouldPostExpense(status, amount)) {
    if (existingExpenseId) {
      await tx.expense.update({
        where: { id: existingExpenseId },
        data: { deletedAt: new Date() },
      });
    }
    return null;
  }

  const expenseData = {
    category: 'Maintenance',
    txnType: 'MAINTENANCE',
    amount: Number(amount),
    expenseDate: new Date(workDate),
    paymentMethod: 'CASH',
    buildingId,
    unitId: unitId || null,
    description: description || null,
    comment: `Maintenance: ${subject}`,
    deletedAt: null,
  };

  if (existingExpenseId) {
    const existing = await tx.expense.findFirst({ where: { id: existingExpenseId } });
    if (existing) {
      await tx.expense.update({
        where: { id: existingExpenseId },
        data: expenseData,
      });
      return existingExpenseId;
    }
  }

  const created = await tx.expense.create({
    data: {
      code: await nextExpenseCode(tx),
      ...expenseData,
      createdById: createdById || null,
    },
  });
  return created.id;
}

function fieldKeyFromLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || `field_${Date.now()}`;
}

// ── Custom field definitions ───────────────────────────────────────────────

router.get(
  '/fields',
  authorize('maintenance:read'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.maintenanceFieldDef.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return success(res, rows);
  }),
);

router.post(
  '/fields',
  authorize('maintenance:update'),
  asyncHandler(async (req, res) => {
    const { label, fieldType = 'text', options, required = false, sortOrder = 0 } = req.body || {};
    if (!label || !String(label).trim()) throw new AppError('Field label is required', 400);
    const type = String(fieldType).toLowerCase();
    if (!FIELD_TYPES.includes(type)) {
      throw new AppError(`fieldType must be one of: ${FIELD_TYPES.join(', ')}`, 400);
    }
    let key = fieldKeyFromLabel(label);
    const clash = await prisma.maintenanceFieldDef.findFirst({ where: { key } });
    if (clash) key = `${key}_${Date.now().toString(36)}`;

    const row = await prisma.maintenanceFieldDef.create({
      data: {
        key,
        label: String(label).trim(),
        fieldType: type,
        options: type === 'select' ? options || [] : undefined,
        required: Boolean(required),
        sortOrder: Number(sortOrder) || 0,
        createdById: req.user?.id || null,
      },
    });
    return success(res, row, 201);
  }),
);

router.patch(
  '/fields/:id',
  authorize('maintenance:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.maintenanceFieldDef.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Custom field not found', 404);
    const { label, fieldType, options, required, sortOrder, isActive } = req.body || {};
    if (fieldType && !FIELD_TYPES.includes(String(fieldType).toLowerCase())) {
      throw new AppError(`fieldType must be one of: ${FIELD_TYPES.join(', ')}`, 400);
    }
    const row = await prisma.maintenanceFieldDef.update({
      where: { id: existing.id },
      data: {
        ...(label !== undefined && { label: String(label).trim() }),
        ...(fieldType !== undefined && { fieldType: String(fieldType).toLowerCase() }),
        ...(options !== undefined && { options }),
        ...(required !== undefined && { required: Boolean(required) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    return success(res, row);
  }),
);

router.delete(
  '/fields/:id',
  authorize('maintenance:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.maintenanceFieldDef.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Custom field not found', 404);
    await prisma.maintenanceFieldDef.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

// ── Summary / report ───────────────────────────────────────────────────────

router.get(
  '/summary',
  authorize('maintenance:read'),
  asyncHandler(async (req, res) => {
    const scope = buildingScope(req.user.buildingIds);
    const base = { deletedAt: null, ...scope };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const spendWhere = {
      ...base,
      status: { not: 'CANCELLED' },
    };

    const [all, monthSpend, byStatus, byBuilding, recent] = await Promise.all([
      prisma.maintenanceRecord.aggregate({
        where: spendWhere,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.maintenanceRecord.aggregate({
        where: { ...spendWhere, workDate: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.maintenanceRecord.groupBy({
        by: ['status'],
        where: base,
        _count: true,
        _sum: { amount: true },
      }),
      prisma.maintenanceRecord.groupBy({
        by: ['buildingId'],
        where: spendWhere,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.maintenanceRecord.findMany({
        where: base,
        include: recordInclude,
        orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
    ]);

    const buildingIds = byBuilding.map((b) => b.buildingId);
    const buildings = buildingIds.length
      ? await prisma.building.findMany({
          where: { id: { in: buildingIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const bMap = Object.fromEntries(buildings.map((b) => [b.id, b]));

    const statusMap = Object.fromEntries(
      byStatus.map((s) => [
        s.status,
        { count: s._count, amount: money(s._sum.amount) },
      ]),
    );

    const activeCount =
      (statusMap.PLANNED?.count || 0) + (statusMap.IN_PROGRESS?.count || 0);

    return success(res, {
      totalRecords: all._count || 0,
      totalSpent: money(all._sum.amount),
      thisMonthSpent: money(monthSpend._sum.amount),
      thisMonthCount: monthSpend._count || 0,
      activeCount,
      completedCount: statusMap.COMPLETED?.count || 0,
      cancelledCount: statusMap.CANCELLED?.count || 0,
      byStatus: statusMap,
      byBuilding: byBuilding.map((b) => ({
        buildingId: b.buildingId,
        buildingName: bMap[b.buildingId]?.name || '—',
        buildingCode: bMap[b.buildingId]?.code || null,
        count: b._count,
        amount: money(b._sum.amount),
      })),
      recent: recent.map(serialize),
    });
  }),
);

router.get(
  '/report',
  authorize('maintenance:read'),
  asyncHandler(async (req, res) => {
    const { from, to, buildingId } = req.query;
    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }
    const where = {
      deletedAt: null,
      status: { not: 'CANCELLED' },
      ...(buildingId
        ? { buildingId: String(buildingId) }
        : buildingScope(req.user.buildingIds)),
      ...(from || to
        ? {
            workDate: {
              ...(from ? { gte: new Date(`${String(from).slice(0, 10)}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${String(to).slice(0, 10)}T23:59:59`) } : {}),
            },
          }
        : {}),
    };

    const rows = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        building: { select: { id: true, name: true, code: true } },
        unit: { select: { id: true, roomNumber: true } },
      },
      orderBy: { workDate: 'desc' },
    });

    const byBuilding = {};
    const byUnit = {};
    const byMonth = {};
    let completed = 0;
    let active = 0;

    for (const r of rows) {
      const amt = money(r.amount);
      const bKey = r.buildingId;
      if (!byBuilding[bKey]) {
        byBuilding[bKey] = {
          buildingId: bKey,
          buildingName: r.building?.name || '—',
          amount: 0,
          count: 0,
        };
      }
      byBuilding[bKey].amount += amt;
      byBuilding[bKey].count += 1;

      if (r.unitId) {
        const uKey = r.unitId;
        if (!byUnit[uKey]) {
          byUnit[uKey] = {
            unitId: uKey,
            roomNumber: r.unit?.roomNumber || '—',
            buildingName: r.building?.name || '—',
            amount: 0,
            count: 0,
          };
        }
        byUnit[uKey].amount += amt;
        byUnit[uKey].count += 1;
      }

      const mk = String(r.workDate).slice(0, 7);
      if (!byMonth[mk]) byMonth[mk] = { month: mk, amount: 0, count: 0 };
      byMonth[mk].amount += amt;
      byMonth[mk].count += 1;

      if (r.status === 'COMPLETED') completed += 1;
      if (r.status === 'PLANNED' || r.status === 'IN_PROGRESS') active += 1;
    }

    const total = rows.reduce((s, r) => s + money(r.amount), 0);

    return success(res, {
      totalCost: total,
      totalRecords: rows.length,
      completed,
      active,
      byBuilding: Object.values(byBuilding).sort((a, b) => b.amount - a.amount),
      byUnit: Object.values(byUnit).sort((a, b) => b.amount - a.amount),
      byMonth: Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)),
    });
  }),
);

// ── CRUD ───────────────────────────────────────────────────────────────────

router.get(
  '/',
  authorize('maintenance:read'),
  asyncHandler(async (req, res) => {
    const {
      buildingId,
      unitId,
      status,
      from,
      to,
      search,
      minAmount,
      maxAmount,
    } = req.query;

    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }
    if (unitId) {
      await assertUnitBuildingAccess(req.user, String(unitId), req.user.buildingIds);
    }

    const where = {
      deletedAt: null,
      ...(buildingId
        ? { buildingId: String(buildingId) }
        : buildingScope(req.user.buildingIds)),
      ...(unitId ? { unitId: String(unitId) } : {}),
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(from || to
        ? {
            workDate: {
              ...(from ? { gte: new Date(`${String(from).slice(0, 10)}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${String(to).slice(0, 10)}T23:59:59`) } : {}),
            },
          }
        : {}),
      ...(minAmount || maxAmount
        ? {
            amount: {
              ...(minAmount ? { gte: Number(minAmount) } : {}),
              ...(maxAmount ? { lte: Number(maxAmount) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: String(search), mode: 'insensitive' } },
              { description: { contains: String(search), mode: 'insensitive' } },
              { code: { contains: String(search), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await prisma.maintenanceRecord.findMany({
      where,
      include: recordInclude,
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
    });
    return success(res, rows.map(serialize));
  }),
);

router.get(
  '/:id',
  authorize('maintenance:read'),
  asyncHandler(async (req, res) => {
    const row = await prisma.maintenanceRecord.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: recordInclude,
    });
    if (!row) throw new AppError('Maintenance record not found', 404);
    await assertBuildingAccess(req.user, row.buildingId, req.user.buildingIds);
    const fields = await prisma.maintenanceFieldDef.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return success(res, { ...serialize(row), fieldDefs: fields });
  }),
);

router.post(
  '/',
  authorize('maintenance:create'),
  asyncHandler(async (req, res) => {
    const {
      subject,
      amount,
      buildingId,
      unitId,
      workDate,
      description,
      status = 'COMPLETED',
      customData,
    } = req.body || {};

    if (!subject || !String(subject).trim()) throw new AppError('Subject is required', 400);
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
      throw new AppError('Amount / cost is required', 400);
    }
    if (!buildingId) throw new AppError('Property / building is required', 400);
    if (!workDate) throw new AppError('Date is required', 400);

    const statusUpper = String(status).toUpperCase();
    if (!STATUSES.includes(statusUpper)) {
      throw new AppError(`Status must be one of: ${STATUSES.join(', ')}`, 400);
    }

    await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);

    let resolvedUnitId = unitId || null;
    if (resolvedUnitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: resolvedUnitId, deletedAt: null },
      });
      if (!unit) throw new AppError('Unit not found', 404);
      if (unit.buildingId !== buildingId) {
        throw new AppError('Unit does not belong to the selected building', 400);
      }
      await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);
    }

    const row = await prisma.$transaction(async (tx) => {
      const expenseId = await syncExpense(tx, {
        existingExpenseId: null,
        subject: String(subject).trim(),
        amount: Number(amount),
        buildingId,
        unitId: resolvedUnitId,
        workDate,
        description,
        status: statusUpper,
        createdById: req.user?.id,
      });

      const created = await tx.maintenanceRecord.create({
        data: {
          code: await nextMaintCode(tx),
          subject: String(subject).trim(),
          amount: Number(amount),
          buildingId,
          unitId: resolvedUnitId,
          workDate: new Date(workDate),
          description: description ? String(description).trim() : null,
          status: statusUpper,
          customData: customData && typeof customData === 'object' ? customData : {},
          expenseId,
          createdById: req.user?.id || null,
        },
        include: recordInclude,
      });

      await logActivity({
        entityType: 'MAINTENANCE',
        entityId: created.id,
        unitId: resolvedUnitId,
        action: 'CREATED',
        summary: `Maintenance created: ${created.subject} (${Number(created.amount)})`,
        meta: {
          amount: Number(created.amount),
          buildingId,
          unitId: resolvedUnitId,
          status: statusUpper,
          expenseId,
        },
        actorId: req.user?.id,
        tx,
      });

      return created;
    });

    return success(res, serialize(row), 201);
  }),
);

router.patch(
  '/:id',
  authorize('maintenance:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.maintenanceRecord.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Maintenance record not found', 404);
    await assertBuildingAccess(req.user, existing.buildingId, req.user.buildingIds);

    const {
      subject,
      amount,
      buildingId,
      unitId,
      workDate,
      description,
      status,
      customData,
    } = req.body || {};

    const nextBuildingId = buildingId !== undefined ? buildingId : existing.buildingId;
    const nextStatus =
      status !== undefined ? String(status).toUpperCase() : existing.status;
    if (status !== undefined && !STATUSES.includes(nextStatus)) {
      throw new AppError(`Status must be one of: ${STATUSES.join(', ')}`, 400);
    }

    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }

    let nextUnitId =
      unitId !== undefined ? (unitId || null) : existing.unitId;
    if (nextUnitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: nextUnitId, deletedAt: null },
      });
      if (!unit) throw new AppError('Unit not found', 404);
      if (unit.buildingId !== nextBuildingId) {
        throw new AppError('Unit does not belong to the selected building', 400);
      }
    }

    const nextSubject =
      subject !== undefined ? String(subject).trim() : existing.subject;
    const nextAmount = amount !== undefined ? Number(amount) : money(existing.amount);
    const nextDate = workDate !== undefined ? workDate : existing.workDate;
    const nextDesc =
      description !== undefined
        ? description
          ? String(description).trim()
          : null
        : existing.description;

    const row = await prisma.$transaction(async (tx) => {
      const expenseId = await syncExpense(tx, {
        existingExpenseId: existing.expenseId,
        subject: nextSubject,
        amount: nextAmount,
        buildingId: nextBuildingId,
        unitId: nextUnitId,
        workDate: nextDate,
        description: nextDesc,
        status: nextStatus,
        createdById: req.user?.id,
      });

      const updated = await tx.maintenanceRecord.update({
        where: { id: existing.id },
        data: {
          subject: nextSubject,
          amount: nextAmount,
          buildingId: nextBuildingId,
          unitId: nextUnitId,
          workDate: new Date(nextDate),
          description: nextDesc,
          status: nextStatus,
          ...(customData !== undefined && {
            customData: customData && typeof customData === 'object' ? customData : {},
          }),
          expenseId,
        },
        include: recordInclude,
      });

      await logActivity({
        entityType: 'MAINTENANCE',
        entityId: updated.id,
        unitId: nextUnitId,
        action: 'UPDATED',
        summary: `Maintenance updated: ${updated.subject} (${Number(updated.amount)})`,
        meta: {
          amount: Number(updated.amount),
          previousAmount: money(existing.amount),
          status: nextStatus,
          expenseId,
        },
        actorId: req.user?.id,
        tx,
      });

      return updated;
    });

    return success(res, serialize(row));
  }),
);

router.delete(
  '/:id',
  authorize('maintenance:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.maintenanceRecord.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Maintenance record not found', 404);
    await assertBuildingAccess(req.user, existing.buildingId, req.user.buildingIds);

    await prisma.$transaction(async (tx) => {
      if (existing.expenseId) {
        await tx.expense.update({
          where: { id: existing.expenseId },
          data: { deletedAt: new Date() },
        });
      }
      await tx.maintenanceRecord.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), expenseId: null },
      });
      await logActivity({
        entityType: 'MAINTENANCE',
        entityId: existing.id,
        unitId: existing.unitId,
        action: 'DELETED',
        summary: `Maintenance deleted: ${existing.subject} (${money(existing.amount)})`,
        meta: { amount: money(existing.amount), buildingId: existing.buildingId },
        actorId: req.user?.id,
        tx,
      });
    });

    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
