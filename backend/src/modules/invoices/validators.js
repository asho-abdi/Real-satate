import { body, param } from 'express-validator';

const STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE'];

export const createInvoiceValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('status').optional().isIn(STATUSES),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('leaseId').optional({ nullable: true }).isUUID(),
  body('reservationId').optional({ nullable: true }).isUUID(),
  body('payerName').trim().notEmpty().withMessage('payerName is required'),
  body('issueDate').isISO8601().withMessage('issueDate is required').toDate(),
  body('dueDate').isISO8601().withMessage('dueDate is required').toDate(),
  body('subtotal').isFloat({ min: 0 }).withMessage('subtotal is required'),
  body('tax').optional().isFloat({ min: 0 }),
  body('total').isFloat({ min: 0 }).withMessage('total is required'),
  body('balance').isFloat({ min: 0 }).withMessage('balance is required'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('notes').optional({ nullable: true }).isString(),
];

export const updateInvoiceValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('status').optional().isIn(STATUSES),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('leaseId').optional({ nullable: true }).isUUID(),
  body('reservationId').optional({ nullable: true }).isUUID(),
  body('payerName').optional().trim().notEmpty(),
  body('issueDate').optional().isISO8601().toDate(),
  body('dueDate').optional().isISO8601().toDate(),
  body('subtotal').optional().isFloat({ min: 0 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('total').optional().isFloat({ min: 0 }),
  body('balance').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('notes').optional({ nullable: true }).isString(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createInvoiceValidators, updateInvoiceValidators, idParamValidators };
