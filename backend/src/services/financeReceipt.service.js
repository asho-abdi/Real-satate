import { Prisma } from '@prisma/client';
import { nextDocumentNumber } from './documentNumber.service.js';
import { asNumber, labelPaymentMethod, normalizePaymentMethod } from '../utils/paymentMethod.js';

/**
 * Idempotent RECEIPT finance document for a payment source (e.g. MONTHLY_PAYMENT).
 */
export async function ensurePaymentReceipt(tx, opts = {}) {
  const type = String(opts.type || 'RECEIPT').toUpperCase();
  const sourceType = opts.sourceType || null;
  const sourceId = opts.sourceId || null;

  if (sourceType && sourceId) {
    const existing = await tx.financeDocument.findFirst({
      where: { type, sourceType, sourceId },
    });
    if (existing) return existing;
  }

  const method = opts.method
    ? normalizePaymentMethod(opts.method, { fallback: 'CASH' })
    : null;
  const number = await nextDocumentNumber(tx, type);

  try {
    return await tx.financeDocument.create({
      data: {
        type,
        number,
        tenantId: opts.tenantId || null,
        businessId: opts.businessId || null,
        shopSaleId: opts.shopSaleId || null,
        unitId: opts.unitId || null,
        customerName: String(opts.customerName || 'Customer').trim(),
        customerPhone: opts.customerPhone || null,
        description: opts.description || null,
        billingPeriod: opts.billingPeriod || null,
        amount: new Prisma.Decimal(String(asNumber(opts.amount))),
        previousBalance: new Prisma.Decimal(String(asNumber(opts.previousBalance))),
        currentCharges: new Prisma.Decimal(String(asNumber(opts.currentCharges ?? opts.amount))),
        amountPaid: new Prisma.Decimal(String(asNumber(opts.amountPaid))),
        remainingBalance: new Prisma.Decimal(String(asNumber(opts.remainingBalance))),
        method,
        reference: opts.reference || null,
        paymentDate: opts.paymentDate ? new Date(opts.paymentDate) : new Date(),
        sourceType,
        sourceId,
        meta: {
          methodLabel: method ? labelPaymentMethod(method) : null,
          ...(opts.meta && typeof opts.meta === 'object' ? opts.meta : {}),
        },
        createdById: opts.createdById || null,
      },
    });
  } catch (err) {
    // Concurrent create: unique (type, sourceType, sourceId) → return winner
    if (err?.code === 'P2002' && sourceType && sourceId) {
      const existing = await tx.financeDocument.findFirst({
        where: { type, sourceType, sourceId },
      });
      if (existing) return existing;
    }
    throw err;
  }
}
