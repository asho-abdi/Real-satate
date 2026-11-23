import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { assertUnitBuildingAccess } from '../../services/access.service.js';
import { buildLeaseSchedule, money } from '../../services/leaseSchedule.service.js';
import {
  applyRentFreeMonths,
  loadLeaseParty,
  materializeLeaseSchedule,
  recordAdvancePayment,
} from '../../services/rentReceipt.service.js';

const router = Router();
router.use(authenticate);

async function partyFromQuery(req) {
  const tenantId = req.query.tenantId || req.body?.tenantId || null;
  const businessId = req.query.businessId || req.body?.businessId || null;
  const party = await loadLeaseParty(prisma, {
    tenantId: tenantId || undefined,
    businessId: businessId || undefined,
  });
  await assertUnitBuildingAccess(req.user, party.unitId, req.user.buildingIds);
  return party;
}

function serializeSchedule(lease, schedule, receipts = []) {
  const advanceReceived = money(
    (receipts || [])
      .filter((r) => r.kind === 'ADVANCE')
      .reduce((s, r) => s + Number(r.amount), 0),
  );
  return {
    registeredAt: lease.createdAt,
    leaseStart: lease.leaseStart,
    leaseEnd: lease.leaseEnd,
    rentFreeMonths: lease.rentFreeMonths || 0,
    rentDueDay: schedule.rentDueDay,
    monthlyRent: schedule.monthlyRent,
    ...schedule,
    receipts: (receipts || []).map((r) => ({
      id: r.id,
      kind: r.kind,
      amount: Number(r.amount),
      monthsCovered: r.monthsCovered,
      startMonth: r.startMonth,
      paymentDate: r.paymentDate,
      method: r.method,
      allocations: (r.allocations || []).map((a) => ({
        month: a.month,
        amount: Number(a.amount),
      })),
    })),
    summary: {
      ...schedule.summary,
      advanceReceived,
    },
  };
}

router.get(
  '/schedule',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const party = await partyFromQuery(req);
    const result = await prisma.$transaction((tx) => materializeLeaseSchedule(tx, party));
    const schedule = buildLeaseSchedule(result.lease, result.lease.payments || []);
    return success(res, serializeSchedule(result.lease, schedule, result.lease.rentReceipts));
  }),
);

router.post(
  '/advance',
  authorize('payments:create'),
  asyncHandler(async (req, res) => {
    const party = await partyFromQuery(req);
    const result = await prisma.$transaction((tx) =>
      recordAdvancePayment(tx, { party, body: req.body || {}, user: req.user }),
    );
    return success(res, result, 201);
  }),
);

router.post(
  '/rent-free',
  authorize('payments:update'),
  asyncHandler(async (req, res) => {
    const party = await partyFromQuery(req);
    if (req.body?.reason == null || !String(req.body.reason).trim()) {
      throw new AppError('reason is required to change rent-free terms', 400);
    }
    const result = await prisma.$transaction((tx) =>
      applyRentFreeMonths(tx, {
        party,
        rentFreeMonths: req.body.rentFreeMonths,
        reason: req.body.reason,
        user: req.user,
      }),
    );
    const schedule = buildLeaseSchedule(result.lease, result.lease.payments || []);
    return success(res, serializeSchedule(result.lease, schedule, result.lease.rentReceipts));
  }),
);

router.get(
  '/overview',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const buildingFilter =
      req.user.buildingIds === null
        ? {}
        : { unit: { buildingId: { in: req.user.buildingIds } } };

    const [tenants, businesses] = await Promise.all([
      prisma.tenant.findMany({
        where: { deletedAt: null, status: 'ACTIVE', ...buildingFilter },
        include: { payments: true, rentReceipts: true, unit: { select: { roomNumber: true } } },
      }),
      prisma.business.findMany({
        where: { deletedAt: null, status: 'ACTIVE', ...buildingFilter },
        include: { payments: true, rentReceipts: true, unit: { select: { roomNumber: true } } },
      }),
    ]);

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const leases = [...tenants.map((t) => ({ kind: 'TENANT', row: t })), ...businesses.map((b) => ({ kind: 'BUSINESS', row: b }))];

    let expectedRent = 0;
    let collected = 0;
    let outstanding = 0;
    let advanceReceived = 0;
    let rentFreeNow = 0;
    let overdueAccounts = 0;
    let expiringSoon = 0;

    for (const { row } of leases) {
      const schedule = buildLeaseSchedule(row, row.payments || []);
      expectedRent += schedule.summary.expectedRent;
      collected += schedule.summary.collected;
      outstanding += schedule.summary.outstanding;
      advanceReceived += (row.rentReceipts || [])
        .filter((r) => r.kind === 'ADVANCE')
        .reduce((s, r) => s + Number(r.amount), 0);
      if (schedule.summary.currentlyRentFree) rentFreeNow += 1;
      if (schedule.summary.overdueCount > 0) overdueAccounts += 1;
      if (row.leaseEnd) {
        const end = new Date(row.leaseEnd);
        if (end >= now && end <= in30) expiringSoon += 1;
      }
    }

    return success(res, {
      activeLeases: leases.length,
      expiringSoon,
      expectedRent: money(expectedRent),
      collected: money(collected),
      outstanding: money(outstanding),
      advanceReceived: money(advanceReceived),
      rentFreeNow,
      overdueAccounts,
    });
  }),
);

export default router;
