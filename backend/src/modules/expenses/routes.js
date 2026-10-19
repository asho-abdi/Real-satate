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

const router = Router();
router.use(authenticate);

const expenseInclude = {
  building: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, roomNumber: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

function serialize(e) {
  if (!e) return e;
  return {
    ...e,
    amount: Number(e.amount),
    createdByName: e.createdBy
      ? `${e.createdBy.firstName || ''} ${e.createdBy.lastName || ''}`.trim() || e.createdBy.email
      : null,
  };
}

function buildingScopeFilter(buildingIds) {
  if (buildingIds === null) return {};
  return {
    OR: [{ buildingId: null }, { buildingId: { in: buildingIds } }],
  };
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

router.get(
  '/',
  authorize('expenses:read'),
  asyncHandler(async (req, res) => {
    const { buildingId, unitId, category, txnType, from, to, source, destination } = req.query;
    if (buildingId) {
      await assertBuildingAccess(req.user, String(buildingId), req.user.buildingIds);
    }

    const where = {
      deletedAt: null,
      ...(buildingId
        ? { buildingId: String(buildingId) }
        : buildingScopeFilter(req.user.buildingIds)),
      ...(unitId ? { unitId: String(unitId) } : {}),
      ...(category ? { category: String(category) } : {}),
      ...(txnType ? { txnType: String(txnType).toUpperCase() } : {}),
      ...(source
        ? { source: { contains: String(source), mode: 'insensitive' } }
        : {}),
      ...(destination
        ? { destination: { contains: String(destination), mode: 'insensitive' } }
        : {}),
      ...(from || to
        ? {
            expenseDate: {
              ...(from ? { gte: new Date(`${String(from).slice(0, 10)}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${String(to).slice(0, 10)}T23:59:59`) } : {}),
            },
          }
        : {}),
    };

    const rows = await prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return success(res, rows.map(serialize));
  }),
);

router.get(
  '/summary',
  authorize('expenses:read'),
  asyncHandler(async (req, res) => {
    const scope = buildingScopeFilter(req.user.buildingIds);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const baseWhere = { deletedAt: null, ...scope };

    const [all, monthRows, yearRows, byType] = await Promise.all([
      prisma.expense.aggregate({ where: baseWhere, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({
        where: { ...baseWhere, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...baseWhere, expenseDate: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['txnType'],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return success(res, {
      totalExpenses: Number(all._sum.amount || 0),
      totalCount: all._count || 0,
      thisMonth: Number(monthRows._sum.amount || 0),
      thisYear: Number(yearRows._sum.amount || 0),
      byType: byType.map((row) => ({
        txnType: row.txnType,
        amount: Number(row._sum.amount || 0),
        count: row._count,
      })),
    });
  }),
);

router.post(
  '/',
  authorize('expenses:create'),
  asyncHandler(async (req, res) => {
    const {
      buildingId,
      unitId,
      category,
      txnType = 'OTHER',
      amount,
      expenseDate,
      paymentMethod = 'CASH',
      source,
      destination,
      account,
      vendor,
      description,
      comment,
    } = req.body || {};

    if (!amount || !expenseDate || !comment) {
      throw new AppError('amount, expenseDate, and comment/reference are required', 400);
    }

    if (buildingId) {
      await assertBuildingAccess(req.user, buildingId, req.user.buildingIds);
    }
    if (unitId) {
      await assertUnitBuildingAccess(req.user, unitId, req.user.buildingIds);
    }

    const method = String(paymentMethod).toUpperCase().replace(/-/g, '_');
    const paymentMethodValue = method === 'E_BESA' || method === 'EBESA' ? 'E_BESA' : 'CASH';
    const type = String(txnType || 'OTHER').toUpperCase();
    const cat = category || type.replace(/_/g, ' ');

    const created = await prisma.$transaction(async (tx) => {
      const code = await nextExpenseCode(tx);
      return tx.expense.create({
        data: {
          code,
          buildingId: buildingId || null,
          unitId: unitId || null,
          category: String(cat).trim(),
          txnType: type,
          amount: Number(amount),
          expenseDate: new Date(expenseDate),
          paymentMethod: paymentMethodValue,
          source: source ? String(source).trim() : null,
          destination: destination ? String(destination).trim() : null,
          account: account ? String(account).trim() : null,
          vendor: vendor ? String(vendor).trim() : null,
          description: description ? String(description).trim() : null,
          comment: String(comment).trim(),
          createdById: req.user.id || null,
        },
        include: expenseInclude,
      });
    });

    return success(res, serialize(created), 201);
  }),
);

router.patch(
  '/:id',
  authorize('expenses:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Transaction not found', 404);
    if (existing.buildingId) {
      await assertBuildingAccess(req.user, existing.buildingId, req.user.buildingIds);
    }

    const {
      category,
      txnType,
      amount,
      expenseDate,
      paymentMethod,
      source,
      destination,
      account,
      vendor,
      description,
      comment,
      unitId,
      buildingId,
    } = req.body || {};

    const method =
      paymentMethod !== undefined
        ? String(paymentMethod).toUpperCase().replace(/-/g, '_')
        : null;

    const updated = await prisma.expense.update({
      where: { id: existing.id },
      data: {
        ...(category !== undefined && { category: String(category).trim() }),
        ...(txnType !== undefined && { txnType: String(txnType).toUpperCase() }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
        ...(method && {
          paymentMethod: method === 'E_BESA' || method === 'EBESA' ? 'E_BESA' : 'CASH',
        }),
        ...(source !== undefined && { source: source ? String(source).trim() : null }),
        ...(destination !== undefined && {
          destination: destination ? String(destination).trim() : null,
        }),
        ...(account !== undefined && { account: account ? String(account).trim() : null }),
        ...(vendor !== undefined && { vendor: vendor ? String(vendor).trim() : null }),
        ...(description !== undefined && {
          description: description ? String(description).trim() : null,
        }),
        ...(comment !== undefined && { comment: String(comment).trim() }),
        ...(unitId !== undefined && { unitId: unitId || null }),
        ...(buildingId !== undefined && { buildingId: buildingId || null }),
      },
      include: expenseInclude,
    });

    return success(res, serialize(updated));
  }),
);

router.delete(
  '/:id',
  authorize('expenses:delete'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Transaction not found', 404);
    if (existing.buildingId) {
      await assertBuildingAccess(req.user, existing.buildingId, req.user.buildingIds);
    }

    await prisma.expense.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
