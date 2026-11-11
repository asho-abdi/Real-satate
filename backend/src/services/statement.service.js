import prisma from '../config/database.js';
import { asNumber } from '../utils/paymentMethod.js';
import { commercialTypeFromUsage } from '../utils/commercialType.js';

function push(lines, row) {
  lines.push(row);
}

function lineTime(d) {
  if (!d) return 0;
  return new Date(d).getTime();
}

function endOfDay(to) {
  return to.getTime() + 86400000 - 1;
}

function inDisplayRange(d, from, to) {
  const t = lineTime(d);
  if (from && t < from.getTime()) return false;
  if (to && t > endOfDay(to)) return false;
  return true;
}

function commercialRentDescription(unit, month) {
  const ct = commercialTypeFromUsage(unit?.usage, unit?.commercialType);
  const label = ct === 'OFFICE' ? 'Office' : 'Shop';
  return `Commercial rent (${label}) (${month})`;
}

function formatUnit(unit) {
  if (!unit) return null;
  const commercialType = commercialTypeFromUsage(unit.usage, unit.commercialType);
  return {
    id: unit.id,
    roomNumber: unit.roomNumber,
    usage: unit.usage,
    unitType: unit.unitType,
    commercialType,
    building: unit.building
      ? { id: unit.building.id, name: unit.building.name, code: unit.building.code }
      : null,
    floor: unit.floor ? { id: unit.floor.id, name: unit.floor.name, level: unit.floor.level } : null,
  };
}

function finalizeStatement(lines, filters) {
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(filters.to) : null;

  lines.sort((a, b) => lineTime(a.date) - lineTime(b.date));

  let balance = 0;
  let liabilityHeld = 0;
  const withBalance = lines.map((line) => {
    if (line.isLiability) {
      if (line.type === 'SECURITY_DEPOSIT') liabilityHeld += line.credit;
      if (line.type === 'DEPOSIT_REFUND') liabilityHeld -= line.debit;
      if (line.type === 'DEPOSIT_DEDUCTION') liabilityHeld -= line.credit;
      return { ...line, balance: Number(balance.toFixed(2)), liabilityHeld: Number(liabilityHeld.toFixed(2)) };
    }
    balance += line.debit - line.credit;
    return { ...line, balance: Number(balance.toFixed(2)), liabilityHeld: Number(liabilityHeld.toFixed(2)) };
  });

  let openingBalance = 0;
  if (from) {
    for (const line of withBalance) {
      if (lineTime(line.date) >= from.getTime()) break;
      if (!line.isLiability) {
        openingBalance += line.debit - line.credit;
      }
    }
    openingBalance = Number(openingBalance.toFixed(2));
  }

  let closingBalance = 0;
  let depositsHeld = 0;
  for (const line of withBalance) {
    if (to && lineTime(line.date) > endOfDay(to)) break;
    if (!line.isLiability) closingBalance = line.balance;
    depositsHeld = line.liabilityHeld;
  }
  closingBalance = Number(closingBalance.toFixed(2));
  depositsHeld = Number(Math.max(0, depositsHeld).toFixed(2));

  let display = withBalance.filter((line) => inDisplayRange(line.date, from, to));

  if (filters.type) {
    const types = String(filters.type)
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (types.length) {
      display = display.filter((line) => types.includes(line.type));
    }
  }
  if (filters.method) {
    const m = String(filters.method).toUpperCase();
    display = display.filter(
      (line) => !(line.credit > 0 && line.method && String(line.method).toUpperCase() !== m),
    );
  }

  if (from) {
    display.unshift({
      date: from,
      description: 'Opening balance',
      type: 'OPENING',
      debit: 0,
      credit: 0,
      method: null,
      reference: null,
      sourceType: null,
      sourceId: null,
      balance: openingBalance,
      liabilityHeld: depositsHeld,
      isOpening: true,
    });
  }

  const periodLines = display.filter((l) => !l.isOpening);
  const totalDebit = Number(
    periodLines.reduce((s, l) => s + (l.isLiability ? 0 : l.debit), 0).toFixed(2),
  );
  const totalCredit = Number(
    periodLines.reduce((s, l) => s + (l.isLiability ? 0 : l.credit), 0).toFixed(2),
  );
  const creditBalance = Number(Math.max(0, -closingBalance).toFixed(2));

  return {
    lines: display,
    summary: {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      outstandingBalance: closingBalance,
      depositsHeld,
      creditBalance,
    },
  };
}

/**
 * Build a chronological tenant/customer statement from existing ledgers.
 * party: { tenantId } | { businessId } | { shopSaleId }
 */
export async function buildStatement(party, filters = {}) {
  let customer = null;
  let unit = null;
  const lines = [];

  if (party.tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: party.tenantId, deletedAt: null },
      include: { unit: { include: { building: true, floor: true } } },
    });
    if (!tenant) return null;
    customer = {
      id: tenant.id,
      name: tenant.fullName,
      phone: tenant.phone,
      type: 'tenant',
    };
    unit = tenant.unit;

    const payments = await prisma.monthlyPayment.findMany({
      where: { tenantId: tenant.id },
      orderBy: { month: 'asc' },
    });
    for (const p of payments) {
      const dueDate = `${p.month}-01`;
      push(lines, {
        date: dueDate,
        description: `Monthly rent (${p.month})`,
        type: 'RENT',
        debit: asNumber(p.amountDue),
        credit: 0,
        method: null,
        reference: null,
        sourceType: 'MONTHLY_PAYMENT',
        sourceId: p.id,
      });
      if (asNumber(p.amountPaid) > 0) {
        push(lines, {
          date: p.paymentDate || dueDate,
          description: `Payment received (${p.month})`,
          type: 'PAYMENT',
          debit: 0,
          credit: asNumber(p.amountPaid),
          method: p.method,
          reference: p.reference || p.receiptNumber,
          sourceType: 'MONTHLY_PAYMENT',
          sourceId: p.id,
        });
      }
    }

    const charges = await prisma.leaseCharge.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      orderBy: { chargeDate: 'asc' },
    });
    for (const c of charges) {
      push(lines, {
        date: c.chargeDate,
        description: c.description || c.category,
        type: c.category === 'MAINTENANCE' ? 'MAINTENANCE' : 'OTHER_CHARGE',
        debit: asNumber(c.amountDue),
        credit: 0,
        method: null,
        reference: null,
        sourceType: 'LEASE_CHARGE',
        sourceId: c.id,
      });
      if (asNumber(c.amountPaid) > 0) {
        push(lines, {
          date: c.chargeDate,
          description: `Payment — ${c.description || c.category}`,
          type: 'PAYMENT',
          debit: 0,
          credit: asNumber(c.amountPaid),
          method: c.method,
          reference: c.reference || c.receiptNumber,
          sourceType: 'LEASE_CHARGE',
          sourceId: c.id,
        });
      }
    }

    const deposits = await prisma.securityDeposit.findMany({
      where: { tenantId: tenant.id, deletedAt: null },
      include: { transactions: { orderBy: { createdAt: 'asc' } } },
    });
    for (const d of deposits) {
      for (const t of d.transactions) {
        if (t.type === 'RECEIVED') {
          push(lines, {
            date: t.createdAt,
            description: 'Security deposit received (held)',
            type: 'SECURITY_DEPOSIT',
            debit: 0,
            credit: asNumber(t.amount),
            method: t.method,
            reference: t.reference,
            sourceType: 'SECURITY_DEPOSIT',
            sourceId: d.id,
            isLiability: true,
          });
        } else if (t.type === 'RETURN') {
          push(lines, {
            date: t.createdAt,
            description: 'Security deposit refund',
            type: 'DEPOSIT_REFUND',
            debit: asNumber(t.amount),
            credit: 0,
            method: t.method,
            reference: t.reference,
            sourceType: 'SECURITY_DEPOSIT',
            sourceId: d.id,
            isLiability: true,
          });
        } else if (t.type === 'DEDUCTION') {
          push(lines, {
            date: t.createdAt,
            description: t.notes || 'Security deposit deduction',
            type: 'DEPOSIT_DEDUCTION',
            debit: 0,
            credit: asNumber(t.amount),
            method: null,
            reference: t.reference,
            sourceType: 'SECURITY_DEPOSIT',
            sourceId: d.id,
            isLiability: true,
          });
        }
      }
    }
  } else if (party.businessId) {
    const business = await prisma.business.findFirst({
      where: { id: party.businessId, deletedAt: null },
      include: { unit: { include: { building: true, floor: true } } },
    });
    if (!business) return null;
    customer = {
      id: business.id,
      name: business.businessName,
      phone: business.phone,
      contactName: business.contactName,
      type: 'business',
    };
    unit = business.unit;

    const payments = await prisma.monthlyPayment.findMany({
      where: { businessId: business.id },
      orderBy: { month: 'asc' },
    });
    for (const p of payments) {
      const dueDate = `${p.month}-01`;
      push(lines, {
        date: dueDate,
        description: commercialRentDescription(unit, p.month),
        type: 'RENT',
        debit: asNumber(p.amountDue),
        credit: 0,
        method: null,
        reference: null,
        sourceType: 'MONTHLY_PAYMENT',
        sourceId: p.id,
      });
      if (asNumber(p.amountPaid) > 0) {
        push(lines, {
          date: p.paymentDate || dueDate,
          description: `Payment received (${p.month})`,
          type: 'PAYMENT',
          debit: 0,
          credit: asNumber(p.amountPaid),
          method: p.method,
          reference: p.reference || p.receiptNumber,
          sourceType: 'MONTHLY_PAYMENT',
          sourceId: p.id,
        });
      }
    }

    const charges = await prisma.leaseCharge.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { chargeDate: 'asc' },
    });
    for (const c of charges) {
      push(lines, {
        date: c.chargeDate,
        description: c.description || c.category,
        type: c.category === 'MONTHLY_CHARGE' ? 'MAINTENANCE' : 'OTHER_CHARGE',
        debit: asNumber(c.amountDue),
        credit: 0,
        method: null,
        reference: null,
        sourceType: 'LEASE_CHARGE',
        sourceId: c.id,
      });
      if (asNumber(c.amountPaid) > 0) {
        push(lines, {
          date: c.chargeDate,
          description: `Payment — ${c.description || c.category}`,
          type: 'PAYMENT',
          debit: 0,
          credit: asNumber(c.amountPaid),
          method: c.method,
          reference: c.reference || c.receiptNumber,
          sourceType: 'LEASE_CHARGE',
          sourceId: c.id,
        });
      }
    }

    const deposits = await prisma.securityDeposit.findMany({
      where: { businessId: business.id, deletedAt: null },
      include: { transactions: { orderBy: { createdAt: 'asc' } } },
    });
    for (const d of deposits) {
      for (const t of d.transactions) {
        if (t.type === 'RECEIVED') {
          push(lines, {
            date: t.createdAt,
            description: 'Security deposit received (held)',
            type: 'SECURITY_DEPOSIT',
            debit: 0,
            credit: asNumber(t.amount),
            method: t.method,
            reference: t.reference,
            sourceType: 'SECURITY_DEPOSIT',
            sourceId: d.id,
            isLiability: true,
          });
        } else if (t.type === 'RETURN') {
          push(lines, {
            date: t.createdAt,
            description: 'Security deposit refund',
            type: 'DEPOSIT_REFUND',
            debit: asNumber(t.amount),
            credit: 0,
            method: t.method,
            reference: t.reference,
            sourceType: 'SECURITY_DEPOSIT',
            sourceId: d.id,
            isLiability: true,
          });
        } else if (t.type === 'DEDUCTION') {
          push(lines, {
            date: t.createdAt,
            description: t.notes || 'Security deposit deduction',
            type: 'DEPOSIT_DEDUCTION',
            debit: 0,
            credit: asNumber(t.amount),
            method: null,
            reference: t.reference,
            sourceType: 'SECURITY_DEPOSIT',
            sourceId: d.id,
            isLiability: true,
          });
        }
      }
    }
  } else if (party.shopSaleId) {
    const sale = await prisma.shopSale.findFirst({
      where: { id: party.shopSaleId, deletedAt: null },
      include: {
        unit: { include: { building: true, floor: true } },
        salePayments: { orderBy: { paymentDate: 'asc' } },
      },
    });
    if (!sale) return null;
    customer = {
      id: sale.id,
      name: sale.buyerName,
      phone: sale.phone,
      type: 'buyer',
    };
    unit = sale.unit;

    push(lines, {
      date: sale.saleDate,
      description: 'Shop purchase / sale amount',
      type: 'SALE',
      debit: asNumber(sale.salePrice),
      credit: 0,
      method: null,
      reference: null,
      sourceType: 'SHOP_SALE',
      sourceId: sale.id,
    });
    for (const sp of sale.salePayments) {
      push(lines, {
        date: sp.paymentDate,
        description: 'Sale payment received',
        type: 'PAYMENT',
        debit: 0,
        credit: asNumber(sp.amount),
        method: sp.method,
        reference: sp.reference || sp.receiptNumber,
        sourceType: 'SHOP_SALE_PAYMENT',
        sourceId: sp.id,
      });
    }

    const charges = await prisma.leaseCharge.findMany({
      where: { unitId: sale.unitId, deletedAt: null, businessId: null, tenantId: null },
      orderBy: { chargeDate: 'asc' },
    });
    for (const c of charges) {
      push(lines, {
        date: c.chargeDate,
        description: c.description || 'Owner / maintenance charge',
        type: 'MAINTENANCE',
        debit: asNumber(c.amountDue),
        credit: 0,
        method: null,
        reference: null,
        sourceType: 'LEASE_CHARGE',
        sourceId: c.id,
      });
      if (asNumber(c.amountPaid) > 0) {
        push(lines, {
          date: c.chargeDate,
          description: `Payment — ${c.description || c.category}`,
          type: 'PAYMENT',
          debit: 0,
          credit: asNumber(c.amountPaid),
          method: c.method,
          reference: c.reference || c.receiptNumber,
          sourceType: 'LEASE_CHARGE',
          sourceId: c.id,
        });
      }
    }
  } else {
    return null;
  }

  const { lines: displayLines, summary } = finalizeStatement(lines, filters);

  return {
    customer,
    unit: formatUnit(unit),
    lines: displayLines,
    summary,
  };
}
