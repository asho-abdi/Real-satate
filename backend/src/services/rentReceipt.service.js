import { AppError } from '../utils/AppError.js';
import { pickPaymentDetails } from '../utils/paymentMethod.js';
import { logActivity } from './activity.service.js';
import {
  buildLeaseSchedule,
  chargeableUnpaidMonths,
  money,
} from './leaseSchedule.service.js';

function partyWhere(lease) {
  if (lease.tenantId) return { tenantId: lease.tenantId };
  if (lease.businessId) return { businessId: lease.businessId };
  throw new AppError('tenantId or businessId is required', 400);
}

export async function loadLeaseParty(tx, { tenantId, businessId }) {
  if (tenantId && businessId) throw new AppError('Provide tenantId or businessId, not both', 400);
  if (tenantId) {
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      include: { payments: true, rentReceipts: { include: { allocations: true } } },
    });
    if (!tenant) throw new AppError('Tenant not found', 404);
    return { kind: 'TENANT', lease: tenant, tenantId: tenant.id, businessId: null, unitId: tenant.unitId };
  }
  if (businessId) {
    const business = await tx.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: { payments: true, rentReceipts: { include: { allocations: true } } },
    });
    if (!business) throw new AppError('Business not found', 404);
    return { kind: 'BUSINESS', lease: business, tenantId: null, businessId: business.id, unitId: business.unitId };
  }
  throw new AppError('tenantId or businessId is required', 400);
}

export function scheduleForLease(lease) {
  return buildLeaseSchedule(lease, lease.payments || []);
}

/**
 * Upsert obligation rows for generated months without rewriting paid history.
 */
export async function materializeLeaseSchedule(tx, party) {
  const lease = party.lease;
  const schedule = buildLeaseSchedule(lease, lease.payments || []);
  const whereParty = partyWhere(party);
  const existing = new Map((lease.payments || []).map((p) => [p.month, p]));

  for (const period of schedule.periods) {
    const row = existing.get(period.month);
    const paid = money(row?.amountPaid);
    if (row) {
      if (paid > 0) continue;
      const nextStatus = period.isRentFree ? 'RENT_FREE' : row.status === 'PAID' ? 'PAID' : 'UNPAID';
      const nextDue = period.isRentFree ? 0 : money(period.amountDue);
      if (
        money(row.amountDue) === nextDue &&
        Boolean(row.isRentFree) === period.isRentFree &&
        row.status === nextStatus
      ) {
        continue;
      }
      await tx.monthlyPayment.update({
        where: { id: row.id },
        data: {
          amountDue: nextDue,
          rentDue: nextDue,
          status: nextStatus,
          isRentFree: period.isRentFree,
        },
      });
    } else {
      await tx.monthlyPayment.create({
        data: {
          ...whereParty,
          month: period.month,
          amountDue: period.amountDue,
          rentDue: period.amountDue,
          amountPaid: 0,
          status: period.isRentFree ? 'RENT_FREE' : 'UNPAID',
          isRentFree: period.isRentFree,
        },
      });
    }
  }

  const refreshed = party.tenantId
    ? await tx.tenant.findFirst({
        where: { id: party.tenantId },
        include: { payments: true, rentReceipts: { include: { allocations: true } } },
      })
    : await tx.business.findFirst({
        where: { id: party.businessId },
        include: { payments: true, rentReceipts: { include: { allocations: true } } },
      });
  return { ...party, lease: refreshed };
}

export async function recordAdvancePayment(tx, { party, body, user }) {
  const months = Math.max(1, Number(body.monthsCovered || body.months || 1));
  const details = pickPaymentDetails(body || {}, body.method || 'CASH');
  const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();

  let working = await materializeLeaseSchedule(tx, party);
  let schedule = buildLeaseSchedule(working.lease, working.lease.payments || []);
  const targets = chargeableUnpaidMonths(schedule, months);
  if (targets.length === 0) {
    throw new AppError('No unpaid rental periods available to allocate', 400);
  }

  const expected = money(targets.reduce((s, p) => s + p.outstanding, 0));
  const amount = body.amount != null && body.amount !== '' ? money(body.amount) : expected;
  if (amount <= 0) throw new AppError('Advance amount must be greater than zero', 400);

  const receipt = await tx.rentReceipt.create({
    data: {
      tenantId: party.tenantId,
      businessId: party.businessId,
      kind: 'ADVANCE',
      amount,
      monthsCovered: targets.length,
      startMonth: targets[0].month,
      method: details.method,
      paymentDate,
      reference: details.reference || null,
      receivedByName: details.receivedByName || null,
      agentName: details.agentName || null,
      officeMpesaNumber: details.officeMpesaNumber || null,
      notes: body.notes || `Advance rent · ${targets.length} month(s)`,
      recordedById: user?.id || null,
    },
  });

  let remaining = amount;
  const allocations = [];
  for (const period of targets) {
    if (remaining <= 0) break;
    const apply = money(Math.min(period.outstanding, remaining));
    remaining = money(remaining - apply);
    const existing = (working.lease.payments || []).find((p) => p.month === period.month);
    const nextPaid = money((existing ? Number(existing.amountPaid) : 0) + apply);
    const nextDue = money(existing?.amountDue ?? period.amountDue);
    const nextStatus = nextPaid + 0.001 >= nextDue ? 'PAID' : 'PARTIAL';

    let paymentRow;
    if (existing) {
      paymentRow = await tx.monthlyPayment.update({
        where: { id: existing.id },
        data: {
          amountPaid: nextPaid,
          amountDue: nextDue,
          rentDue: nextDue,
          status: nextStatus,
          isAdvance: true,
          paymentDate: existing.paymentDate || paymentDate,
          method: details.method,
          reference: details.reference || existing.reference,
          receivedByName: details.receivedByName || existing.receivedByName,
          recordedById: user?.id || existing.recordedById,
        },
      });
    } else {
      paymentRow = await tx.monthlyPayment.create({
        data: {
          ...partyWhere(party),
          month: period.month,
          amountDue: nextDue,
          rentDue: nextDue,
          amountPaid: nextPaid,
          status: nextStatus,
          isAdvance: true,
          paymentDate,
          method: details.method,
          reference: details.reference || null,
          receivedByName: details.receivedByName || null,
          recordedById: user?.id || null,
        },
      });
    }

    const alloc = await tx.rentAllocation.create({
      data: {
        receiptId: receipt.id,
        month: period.month,
        amount: apply,
        monthlyPaymentId: paymentRow.id,
      },
    });
    allocations.push({ ...alloc, amount: apply, month: period.month });
  }

  await logActivity({
    tx,
    entityType: party.kind,
    entityId: party.tenantId || party.businessId,
    unitId: party.unitId,
    action: 'ADVANCE_RENT_RECORDED',
    summary: `Advance rent ${amount} allocated to ${allocations.length} month(s)`,
    meta: {
      receiptId: receipt.id,
      amount,
      months: allocations.map((a) => a.month),
    },
    actorId: user?.id || null,
  });

  working = await materializeLeaseSchedule(tx, {
    ...party,
    lease: party.tenantId
      ? await tx.tenant.findFirst({
          where: { id: party.tenantId },
          include: { payments: true, rentReceipts: { include: { allocations: true } } },
        })
      : await tx.business.findFirst({
          where: { id: party.businessId },
          include: { payments: true, rentReceipts: { include: { allocations: true } } },
        }),
  });

  return {
    receipt: { ...receipt, amount },
    allocations,
    schedule: buildLeaseSchedule(working.lease, working.lease.payments || []),
  };
}

export async function applyRentFreeMonths(tx, { party, rentFreeMonths, reason, user }) {
  const prev = Number(party.lease.rentFreeMonths || 0);
  const next = Math.max(0, Number(rentFreeMonths) || 0);
  const data = { rentFreeMonths: next };

  if (party.tenantId) {
    await tx.tenant.update({ where: { id: party.tenantId }, data });
  } else {
    await tx.business.update({ where: { id: party.businessId }, data });
  }

  await logActivity({
    tx,
    entityType: party.kind,
    entityId: party.tenantId || party.businessId,
    unitId: party.unitId,
    action: 'RENT_FREE_UPDATED',
    summary: `Rent-free months ${prev} → ${next}`,
    meta: { previous: prev, next, reason: reason || null },
    actorId: user?.id || null,
  });

  const refreshed = party.tenantId
    ? await tx.tenant.findFirst({
        where: { id: party.tenantId },
        include: { payments: true, rentReceipts: { include: { allocations: true } } },
      })
    : await tx.business.findFirst({
        where: { id: party.businessId },
        include: { payments: true, rentReceipts: { include: { allocations: true } } },
      });

  return materializeLeaseSchedule(tx, { ...party, lease: refreshed });
}
