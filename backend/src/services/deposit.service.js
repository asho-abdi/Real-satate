import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { asNumber, normalizePaymentMethod, pickPaymentDetails } from '../utils/paymentMethod.js';
import { ensurePaymentReceipt } from './financeReceipt.service.js';

function money(n) {
  return new Prisma.Decimal(String(Number(n).toFixed(2)));
}

function resolveStatus(amount, returned, deducted) {
  const remaining = Number((amount - returned - deducted).toFixed(2));
  if (remaining <= 0) {
    if (deducted > 0 && returned <= 0) return 'DEDUCTED';
    if (deducted > 0 && returned > 0) return 'FULLY_RETURNED';
    return 'FULLY_RETURNED';
  }
  if (returned > 0 || deducted > 0) return 'PARTIALLY_RETURNED';
  return 'HELD';
}

export async function createDeposit(payload, userId) {
  const amount = asNumber(payload.amount);
  if (!(amount > 0)) throw new AppError('Deposit amount must be greater than 0', 400);
  if (!payload.unitId) throw new AppError('unitId is required', 400);
  if (!payload.tenantId && !payload.businessId && !payload.shopSaleId) {
    throw new AppError('tenantId, businessId, or shopSaleId is required', 400);
  }

  const details = pickPaymentDetails(payload, payload.method);

  return prisma.$transaction(async (tx) => {
    const deposit = await tx.securityDeposit.create({
      data: {
        tenantId: payload.tenantId || null,
        businessId: payload.businessId || null,
        shopSaleId: payload.shopSaleId || null,
        unitId: payload.unitId,
        amount: money(amount),
        remainingAmount: money(amount),
        dateReceived: payload.dateReceived ? new Date(payload.dateReceived) : new Date(),
        method: details.method,
        reference: details.reference,
        receivedByName: details.receivedByName,
        agentName: details.agentName,
        officeMpesaNumber: details.officeMpesaNumber,
        status: 'HELD',
        notes: payload.notes || null,
        createdById: userId || null,
        updatedById: userId || null,
      },
      include: {
        unit: { include: { building: true, floor: true } },
        tenant: true,
        business: true,
        transactions: { orderBy: { createdAt: 'asc' } },
      },
    });

    const txn = await tx.securityDepositTxn.create({
      data: {
        depositId: deposit.id,
        type: 'RECEIVED',
        amount: money(amount),
        method: details.method,
        reference: details.reference,
        notes: payload.notes || 'Security deposit received',
        createdById: userId || null,
      },
    });

    const customerName =
      deposit.tenant?.fullName || deposit.business?.businessName || 'Customer';
    const customerPhone = deposit.tenant?.phone || deposit.business?.phone || null;
    await ensurePaymentReceipt(tx, {
      sourceType: 'SECURITY_DEPOSIT_TXN',
      sourceId: txn.id,
      tenantId: deposit.tenantId,
      businessId: deposit.businessId,
      shopSaleId: deposit.shopSaleId,
      unitId: deposit.unitId,
      customerName,
      customerPhone,
      amount,
      amountPaid: amount,
      remainingBalance: 0,
      currentCharges: amount,
      previousBalance: 0,
      method: details.method,
      reference: details.reference,
      paymentDate: deposit.dateReceived,
      description: 'Security deposit received (held — not revenue)',
      createdById: userId || null,
      meta: { depositLiability: true },
    });

    // Keep legacy static field in sync when linked to a lease
    if (payload.tenantId) {
      await tx.tenant.update({
        where: { id: payload.tenantId },
        data: { securityDeposit: money(amount) },
      });
    }
    if (payload.businessId) {
      await tx.business.update({
        where: { id: payload.businessId },
        data: { securityDeposit: money(amount) },
      });
    }

    return tx.securityDeposit.findUnique({
      where: { id: deposit.id },
      include: {
        unit: { include: { building: true, floor: true } },
        tenant: true,
        business: true,
        shopSale: true,
        transactions: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  });
}

/**
 * Settle deposit on checkout: return and/or deduct.
 * Body: { returnAmount, deductAmount, returnMethod, reference, notes, reason }
 */
export async function settleDeposit(depositId, payload, userId) {
  const returnAmount = asNumber(payload.returnAmount);
  const deductAmount = asNumber(payload.deductAmount);
  if (returnAmount < 0 || deductAmount < 0) {
    throw new AppError('Amounts cannot be negative', 400);
  }
  if (returnAmount === 0 && deductAmount === 0) {
    throw new AppError('Provide a return amount and/or deduction amount', 400);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.securityDeposit.findFirst({
      where: { id: depositId, deletedAt: null },
    });
    if (!existing) throw new AppError('Deposit not found', 404);

    const remaining = asNumber(existing.remainingAmount);
    const total = returnAmount + deductAmount;
    if (total > remaining + 0.001) {
      throw new AppError(`Cannot settle more than remaining ${remaining}`, 400);
    }

    if (deductAmount > 0 && !String(payload.reason || payload.notes || '').trim()) {
      throw new AppError('Reason is required when deducting from a deposit', 400);
    }

    let returnMethod = null;
    if (returnAmount > 0) {
      returnMethod = normalizePaymentMethod(payload.returnMethod || payload.method, {
        fallback: 'CASH',
      });
    }

    if (returnAmount > 0) {
      await tx.securityDepositTxn.create({
        data: {
          depositId,
          type: 'RETURN',
          amount: money(returnAmount),
          method: returnMethod,
          reference: payload.reference || null,
          notes: payload.notes || 'Deposit returned',
          createdById: userId || null,
        },
      });
    }
    if (deductAmount > 0) {
      await tx.securityDepositTxn.create({
        data: {
          depositId,
          type: 'DEDUCTION',
          amount: money(deductAmount),
          method: null,
          reference: payload.reference || null,
          notes: payload.reason || payload.notes || 'Deposit deduction',
          createdById: userId || null,
        },
      });
    }

    const returned = asNumber(existing.returnedAmount) + returnAmount;
    const deducted = asNumber(existing.deductedAmount) + deductAmount;
    const amount = asNumber(existing.amount);
    const nextRemaining = Number((amount - returned - deducted).toFixed(2));
    const status = resolveStatus(amount, returned, deducted);

    return tx.securityDeposit.update({
      where: { id: depositId },
      data: {
        returnedAmount: money(returned),
        deductedAmount: money(deducted),
        remainingAmount: money(Math.max(0, nextRemaining)),
        status,
        returnDate: returnAmount > 0 ? new Date(payload.returnDate || Date.now()) : existing.returnDate,
        returnMethod: returnMethod || existing.returnMethod,
        notes: payload.notes || existing.notes,
        updatedById: userId || null,
      },
      include: {
        unit: { include: { building: true, floor: true } },
        tenant: true,
        business: true,
        shopSale: true,
        transactions: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  });
}

export async function listDeposits(filters = {}) {
  const where = {
    deletedAt: null,
    ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
    ...(filters.businessId ? { businessId: filters.businessId } : {}),
    ...(filters.shopSaleId ? { shopSaleId: filters.shopSaleId } : {}),
    ...(filters.unitId ? { unitId: filters.unitId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.buildingId
      ? { unit: { buildingId: filters.buildingId, deletedAt: null } }
      : {}),
  };

  return prisma.securityDeposit.findMany({
    where,
    include: {
      unit: { include: { building: true, floor: true } },
      tenant: true,
      business: true,
      shopSale: true,
      transactions: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { dateReceived: 'desc' },
  });
}

export async function depositSummary(buildingIds = null) {
  const where = {
    deletedAt: null,
    ...(buildingIds
      ? { unit: { buildingId: { in: buildingIds }, deletedAt: null } }
      : {}),
  };
  const rows = await prisma.securityDeposit.findMany({ where });
  const summary = {
    held: 0,
    returned: 0,
    deducted: 0,
    partiallyReturned: 0,
    fullyReturned: 0,
    outstandingToReturn: 0,
    countHeld: 0,
    countPartial: 0,
    countFullyReturned: 0,
    countDeducted: 0,
  };
  for (const d of rows) {
    const rem = asNumber(d.remainingAmount);
    summary.outstandingToReturn += rem;
    summary.returned += asNumber(d.returnedAmount);
    summary.deducted += asNumber(d.deductedAmount);
    if (d.status === 'HELD') {
      summary.held += rem;
      summary.countHeld += 1;
    } else if (d.status === 'PARTIALLY_RETURNED') {
      summary.partiallyReturned += rem;
      summary.countPartial += 1;
    } else if (d.status === 'FULLY_RETURNED') {
      summary.countFullyReturned += 1;
    } else if (d.status === 'DEDUCTED') {
      summary.countDeducted += 1;
    }
  }
  for (const k of Object.keys(summary)) {
    if (typeof summary[k] === 'number' && !k.startsWith('count')) {
      summary[k] = Number(summary[k].toFixed(2));
    }
  }
  return summary;
}
