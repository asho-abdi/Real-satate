import { body, param } from 'express-validator';

const STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL'];
const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'];
const TYPES = [
  'MONTHLY_RENT',
  'BUSINESS_RENT',
  'DAILY_BOOKING',
  'UTILITY',
  'SERVICE',
  'DEPOSIT',
  'REFUND',
  'OTHER',
];

export const createPaymentValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('type').isIn(TYPES).withMessage('type is required'),
  body('status').optional().isIn(STATUSES),
  body('method').optional().isIn(METHODS),
  body('amount').isFloat({ min: 0 }).withMessage('amount is required'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('leaseId').optional({ nullable: true }).isUUID(),
  body('reservationId').optional({ nullable: true }).isUUID(),
  body('invoiceId').optional({ nullable: true }).isUUID(),
  body('payerName').trim().notEmpty().withMessage('payerName is required'),
  body('reference').optional({ nullable: true }).isString(),
  body('paidAt').optional({ nullable: true }).isISO8601().toDate(),
  body('receivedById').optional({ nullable: true }).isUUID(),
  body('notes').optional({ nullable: true }).isString(),
];

export const updatePaymentValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('type').optional().isIn(TYPES),
  body('status').optional().isIn(STATUSES),
  body('method').optional().isIn(METHODS),
  body('amount').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('leaseId').optional({ nullable: true }).isUUID(),
  body('reservationId').optional({ nullable: true }).isUUID(),
  body('invoiceId').optional({ nullable: true }).isUUID(),
  body('payerName').optional().trim().notEmpty(),
  body('reference').optional({ nullable: true }).isString(),
  body('paidAt').optional({ nullable: true }).isISO8601().toDate(),
  body('receivedById').optional({ nullable: true }).isUUID(),
  body('notes').optional({ nullable: true }).isString(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createPaymentValidators, updatePaymentValidators, idParamValidators };
