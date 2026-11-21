import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { buildStatement } from '../../services/statement.service.js';
import { nextDocumentNumber } from '../../services/documentNumber.service.js';
import { streamFinanceDocumentPdf, streamStatementPdf } from '../../utils/financePdf.js';
import { asNumber, labelPaymentMethod, normalizePaymentMethod } from '../../utils/paymentMethod.js';
import { getAccessibleBuildingIds } from '../../services/access.service.js';
import {
  assertFinanceCreateAccess,
  assertFinanceDocumentAccess,
  assertStatementPartyAccess,
  financeDocumentBuildingFilter,
} from '../../services/financeAccess.service.js';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate);

async function companySettings() {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'app.name',
          'currency',
          'currency.usdKesRate',
          'payments.officeMpesaNumber',
          'payments.agentAccountName',
          'payments.agentAccountReference',
        ],
      },
    },
  });
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  const rate = Number(map['currency.usdKesRate']);
  return {
    companyName: map['app.name'] || 'RJK REALTY',
    currency: map.currency || 'KES',
    usdKesRate: Number.isFinite(rate) && rate > 0 ? rate : 129.5,
    officeMpesaNumber: map['payments.officeMpesaNumber'] || null,
    agentAccountName: map['payments.agentAccountName'] || null,
    agentAccountReference: map['payments.agentAccountReference'] || null,
  };
}

function paymentDefaultsPayload(s) {
  return {
    officeMpesaNumber: s.officeMpesaNumber,
    agentAccountName: s.agentAccountName,
    agentAccountReference: s.agentAccountReference,
  };
}

function financeDocMetaFromBody(body, company, method) {
  return {
    buildingName: body.buildingName || null,
    floorName: body.floorName || null,
    unitNumber: body.unitNumber || null,
    receivedBy: body.receivedByName || body.receivedBy || null,
    methodLabel: method ? labelPaymentMethod(method) : null,
    companyName: company.companyName,
    bookingCode: body.bookingCode || null,
    checkInTime: body.checkInTime || null,
    nightsQuantity: body.nightsQuantity != null ? Number(body.nightsQuantity) : null,
    nightsStayed: body.nightsStayed != null ? Number(body.nightsStayed) : null,
    guestsCount: body.guestsCount != null ? Number(body.guestsCount) : null,
    ratePerNight: body.ratePerNight != null ? Number(body.ratePerNight) : null,
    taxesAmount: body.taxesAmount != null ? Number(body.taxesAmount) : null,
    securityDepositPaid:
      body.securityDepositPaid != null ? Number(body.securityDepositPaid) : null,
    securityDepositHeld:
      body.securityDepositHeld != null ? Number(body.securityDepositHeld) : null,
    securityDepositStatus: body.securityDepositStatus || null,
  };
}

const docInclude = {
  unit: { include: { building: true, floor: true } },
  tenant: { include: { unit: { select: { buildingId: true } } } },
  business: { include: { unit: { select: { buildingId: true } } } },
  shopSale: { include: { unit: { select: { buildingId: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

router.get(
  '/payment-defaults',
  authorize('payments:read'),
  asyncHandler(async (_req, res) => {
    const s = await companySettings();
    return success(res, paymentDefaultsPayload(s));
  }),
);

router.get(
  '/office-mpesa',
  authorize('payments:read'),
  asyncHandler(async (_req, res) => {
    const s = await companySettings();
    return success(res, paymentDefaultsPayload(s));
  }),
);

router.get(
  '/statements',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const party = {
      tenantId: req.query.tenantId || undefined,
      businessId: req.query.businessId || undefined,
      shopSaleId: req.query.shopSaleId || undefined,
    };
    if (!party.tenantId && !party.businessId && !party.shopSaleId) {
      throw new AppError('tenantId, businessId, or shopSaleId is required', 400);
    }
    await assertStatementPartyAccess(req.user, party);
    const statement = await buildStatement(party, {
      from: req.query.from,
      to: req.query.to,
      type: req.query.type,
      method: req.query.method,
    });
    if (!statement) throw new AppError('Party not found', 404);
    return success(res, statement);
  }),
);

router.get(
  '/statements/pdf',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const party = {
      tenantId: req.query.tenantId || undefined,
      businessId: req.query.businessId || undefined,
      shopSaleId: req.query.shopSaleId || undefined,
    };
    await assertStatementPartyAccess(req.user, party);
    const statement = await buildStatement(party, {
      from: req.query.from,
      to: req.query.to,
      type: req.query.type,
      method: req.query.method,
    });
    if (!statement) throw new AppError('Party not found', 404);
    const company = await companySettings();
    return streamStatementPdf(res, statement, company, { from: req.query.from, to: req.query.to });
  }),
);

router.post(
  '/documents',
  authorize('payments:create'),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const type = String(body.type || '').toUpperCase();
    if (type !== 'INVOICE' && type !== 'RECEIPT') {
      throw new AppError('type must be INVOICE or RECEIPT', 400);
    }
    if (!body.customerName) throw new AppError('customerName is required', 400);

    await assertFinanceCreateAccess(req.user, body);

    const company = await companySettings();
    const method = body.method
      ? normalizePaymentMethod(body.method, { fallback: 'CASH' })
      : null;

    const moneyDec = (v) => new Prisma.Decimal(String(asNumber(v)));
    const refreshableSources = new Set([
      'BOOKING_ACCOMMODATION',
      'BOOKING_PAYMENT',
      'SECURITY_DEPOSIT_TXN',
      'SECURITY_DEPOSIT',
    ]);

    const doc = await prisma.$transaction(async (tx) => {
      if (body.sourceType && body.sourceId) {
        const existing = await tx.financeDocument.findFirst({
          where: {
            type,
            sourceType: String(body.sourceType),
            sourceId: String(body.sourceId),
          },
        });
        if (existing) {
          await assertFinanceDocumentAccess(req.user, existing);
          // Refresh booking/deposit docs so regenerated PDFs use corrected totals
          if (refreshableSources.has(String(body.sourceType))) {
            return tx.financeDocument.update({
              where: { id: existing.id },
              data: {
                customerName: String(body.customerName).trim(),
                customerPhone: body.customerPhone || existing.customerPhone,
                description: body.description || existing.description,
                billingPeriod: body.billingPeriod || existing.billingPeriod,
                amount: moneyDec(body.amount),
                previousBalance: moneyDec(body.previousBalance),
                currentCharges: moneyDec(body.currentCharges ?? body.amount),
                amountPaid: moneyDec(body.amountPaid),
                remainingBalance: moneyDec(body.remainingBalance),
                method: method || existing.method,
                reference: body.reference || existing.reference,
                dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
                paymentDate: body.paymentDate
                  ? new Date(body.paymentDate)
                  : existing.paymentDate,
                notes: body.notes || existing.notes,
                unitId: body.unitId || existing.unitId,
                meta: {
                  ...(existing.meta && typeof existing.meta === 'object' ? existing.meta : {}),
                  ...financeDocMetaFromBody(body, company, method),
                  correctedAt: new Date().toISOString(),
                },
              },
            });
          }
          return existing;
        }
      }

      const number = await nextDocumentNumber(tx, type);
      try {
        return await tx.financeDocument.create({
          data: {
            type,
            number,
            tenantId: body.tenantId || null,
            businessId: body.businessId || null,
            shopSaleId: body.shopSaleId || null,
            unitId: body.unitId || null,
            customerName: String(body.customerName).trim(),
            customerPhone: body.customerPhone || null,
            description: body.description || null,
            billingPeriod: body.billingPeriod || null,
            amount: moneyDec(body.amount),
            previousBalance: moneyDec(body.previousBalance),
            currentCharges: moneyDec(body.currentCharges ?? body.amount),
            amountPaid: moneyDec(body.amountPaid),
            remainingBalance: moneyDec(body.remainingBalance),
            method,
            reference: body.reference || null,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
            notes: body.notes || null,
            sourceType: body.sourceType || null,
            sourceId: body.sourceId || null,
            meta: financeDocMetaFromBody(body, company, method),
            createdById: req.user.id,
          },
        });
      } catch (err) {
        // Concurrent create with same source — refresh or return existing
        if (err?.code === 'P2002' && body.sourceType && body.sourceId) {
          const existing = await tx.financeDocument.findFirst({
            where: {
              type,
              sourceType: String(body.sourceType),
              sourceId: String(body.sourceId),
            },
          });
          if (existing && refreshableSources.has(String(body.sourceType))) {
            return tx.financeDocument.update({
              where: { id: existing.id },
              data: {
                amount: moneyDec(body.amount),
                previousBalance: moneyDec(body.previousBalance),
                currentCharges: moneyDec(body.currentCharges ?? body.amount),
                amountPaid: moneyDec(body.amountPaid),
                remainingBalance: moneyDec(body.remainingBalance),
                description: body.description || existing.description,
                notes: body.notes || existing.notes,
                meta: {
                  ...(existing.meta && typeof existing.meta === 'object' ? existing.meta : {}),
                  ...financeDocMetaFromBody(body, company, method),
                },
              },
            });
          }
          if (existing) return existing;
        }
        throw err;
      }
    });

    return success(res, doc, 201);
  }),
);

router.get(
  '/documents',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const buildingIds = await getAccessibleBuildingIds(req.user);
    const where = {
      ...financeDocumentBuildingFilter(buildingIds),
      ...(req.query.type ? { type: String(req.query.type).toUpperCase() } : {}),
      ...(req.query.tenantId ? { tenantId: req.query.tenantId } : {}),
      ...(req.query.businessId ? { businessId: req.query.businessId } : {}),
      ...(req.query.unitId ? { unitId: req.query.unitId } : {}),
    };
    const rows = await prisma.financeDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        unit: { include: { building: true, floor: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return success(res, rows);
  }),
);

router.get(
  '/documents/:id',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const row = await prisma.financeDocument.findUnique({
      where: { id: req.params.id },
      include: docInclude,
    });
    await assertFinanceDocumentAccess(req.user, row);
    return success(res, row);
  }),
);

router.get(
  '/documents/:id/pdf',
  authorize('payments:read'),
  asyncHandler(async (req, res) => {
    const row = await prisma.financeDocument.findUnique({
      where: { id: req.params.id },
      include: docInclude,
    });
    await assertFinanceDocumentAccess(req.user, row);
    const company = await companySettings();
    const meta = row.meta && typeof row.meta === 'object' ? row.meta : {};
    return streamFinanceDocumentPdf(
      res,
      {
        type: row.type,
        number: row.number,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        description: row.description,
        billingPeriod: row.billingPeriod,
        amount: asNumber(row.amount),
        previousBalance: asNumber(row.previousBalance),
        currentCharges: asNumber(row.currentCharges),
        amountPaid: asNumber(row.amountPaid),
        remainingBalance: asNumber(row.remainingBalance),
        method: row.method,
        methodLabel: meta.methodLabel || (row.method ? labelPaymentMethod(row.method) : null),
        reference: row.reference,
        dueDate: row.dueDate,
        paymentDate: row.paymentDate || row.createdAt,
        notes: row.notes,
        receivedBy: meta.receivedBy,
        buildingName: meta.buildingName || row.unit?.building?.name,
        floorName: meta.floorName || row.unit?.floor?.name,
        unitNumber: meta.unitNumber || row.unit?.roomNumber,
        bookingCode: meta.bookingCode || null,
        checkInTime: meta.checkInTime || null,
        nightsQuantity: meta.nightsQuantity,
        nightsStayed: meta.nightsStayed,
        guestsCount: meta.guestsCount,
        ratePerNight: meta.ratePerNight,
        taxesAmount: meta.taxesAmount,
        securityDepositPaid: meta.securityDepositPaid,
        securityDepositHeld: meta.securityDepositHeld,
        securityDepositStatus: meta.securityDepositStatus,
        createdAt: row.createdAt,
      },
      company,
      { format: req.query.format === 'slip' ? 'slip' : 'a4' },
    );
  }),
);

export default router;
