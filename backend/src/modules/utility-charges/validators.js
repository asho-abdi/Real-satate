import { body, param } from 'express-validator';

const STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE'];

export const createUtilityChargeValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('unitId').isUUID().withMessage('unitId is required'),
  body('invoiceId').optional({ nullable: true }).isUUID(),
  body('utilityType').trim().notEmpty().withMessage('utilityType is required'),
  body('amount').isFloat({ min: 0 }).withMessage('amount is required'),
  body('periodStart').isISO8601().withMessage('periodStart is required').toDate(),
  body('periodEnd').isISO8601().withMessage('periodEnd is required').toDate(),
  body('status').optional().isIn(STATUSES),
  body('notes').optional({ nullable: true }).isString(),
];

export const updateUtilityChargeValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('unitId').optional().isUUID(),
  body('invoiceId').optional({ nullable: true }).isUUID(),
  body('utilityType').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ min: 0 }),
  body('periodStart').optional().isISO8601().toDate(),
  body('periodEnd').optional().isISO8601().toDate(),
  body('status').optional().isIn(STATUSES),
  body('notes').optional({ nullable: true }).isString(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createUtilityChargeValidators, updateUtilityChargeValidators, idParamValidators };
