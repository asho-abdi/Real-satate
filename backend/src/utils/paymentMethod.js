import { AppError } from './AppError.js';
import { Prisma } from '@prisma/client';

/** Controlled payment methods exposed in the product UI. */
export const ACTIVE_PAYMENT_METHODS = ['CASH', 'MPESA', 'AGENT'];

const ALIASES = {
  CASH: 'CASH',
  CASH_PAYMENT: 'CASH',
  MPESA: 'MPESA',
  'MPESA – OFFICE NUMBER': 'MPESA',
  'MPESA - OFFICE NUMBER': 'MPESA',
  M_PESA: 'MPESA',
  E_BESA: 'MPESA',
  EBESA: 'MPESA',
  'E-BESA': 'MPESA',
  AGENT: 'AGENT',
  'AGENT – WITHDRAWAL FROM OFFICE AGENT': 'AGENT',
  'AGENT - WITHDRAWAL FROM OFFICE AGENT': 'AGENT',
};

/**
 * Normalize client payment method to a Prisma PaymentMethod value.
 * Legacy E_BESA is accepted and stored/returned as MPESA for new writes.
 */
export function normalizePaymentMethod(value, { required = false, fallback = 'CASH' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError('Payment method is required', 400);
    return fallback;
  }
  const key = String(value).trim().toUpperCase().replace(/\s+/g, ' ');
  const compact = key.replace(/[\s–—-]+/g, '_');
  const mapped =
    ALIASES[key] ||
    ALIASES[compact] ||
    (ACTIVE_PAYMENT_METHODS.includes(compact) ? compact : null);
  if (!mapped) {
    throw new AppError(
      'Payment method must be CASH, MPESA – OFFICE NUMBER, or AGENT – WITHDRAWAL FROM OFFICE AGENT',
      400,
    );
  }
  return mapped;
}

/** Display label for API/UI. */
export function labelPaymentMethod(value) {
  const method = normalizePaymentMethod(value, { fallback: 'CASH' });
  if (method === 'MPESA') return 'MPESA – Office Number';
  if (method === 'AGENT') return 'Agent – Withdrawal from Office Agent';
  return 'Cash';
}

/**
 * Extract method-specific payment detail fields from a request body.
 */
export function pickPaymentDetails(body = {}, method) {
  const m = normalizePaymentMethod(method, { fallback: 'CASH' });
  const details = {
    method: m,
    reference: body.reference != null ? String(body.reference).trim() || null : null,
    receivedByName:
      body.receivedByName != null ? String(body.receivedByName).trim() || null : null,
    agentName: null,
    officeMpesaNumber: null,
  };

  if (m === 'MPESA') {
    details.officeMpesaNumber =
      body.officeMpesaNumber != null
        ? String(body.officeMpesaNumber).trim() || null
        : null;
    if (!details.reference) {
      throw new AppError('MPESA transaction/reference number is required', 400);
    }
  }

  if (m === 'AGENT') {
    details.agentName =
      body.agentName != null ? String(body.agentName).trim() || null : null;
    if (!details.agentName) {
      throw new AppError('Agent name is required', 400);
    }
  }

  return details;
}

export function decimal(value) {
  return new Prisma.Decimal(String(value ?? 0));
}

export function asNumber(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value.toNumber) return value.toNumber();
  return Number(value) || 0;
}
