import { body, param } from 'express-validator';

const TYPES = ['RESIDENTIAL', 'COMMERCIAL'];
const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'RENEWED', 'TERMINATED', 'COMPLETED'];

export const createLeaseValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('type').isIn(TYPES).withMessage('type is required'),
  body('status').optional().isIn(STATUSES),
  body('unitId').isUUID().withMessage('unitId is required'),
  body('residentialTenantId').optional({ nullable: true }).isUUID(),
  body('commercialTenantId').optional({ nullable: true }).isUUID(),
  body('startDate').isISO8601().withMessage('startDate is required').toDate(),
  body('endDate').optional({ nullable: true }).isISO8601().toDate(),
  body('rentAmount').isFloat({ min: 0 }).withMessage('rentAmount is required'),
  body('depositAmount').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('renewalDate').optional({ nullable: true }).isISO8601().toDate(),
  body('signedAt').optional({ nullable: true }).isISO8601().toDate(),
  body('documents').optional(),
  body('terms').optional({ nullable: true }).isString(),
];

export const updateLeaseValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('type').optional().isIn(TYPES),
  body('status').optional().isIn(STATUSES),
  body('unitId').optional().isUUID(),
  body('residentialTenantId').optional({ nullable: true }).isUUID(),
  body('commercialTenantId').optional({ nullable: true }).isUUID(),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional({ nullable: true }).isISO8601().toDate(),
  body('rentAmount').optional().isFloat({ min: 0 }),
  body('depositAmount').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('renewalDate').optional({ nullable: true }).isISO8601().toDate(),
  body('signedAt').optional({ nullable: true }).isISO8601().toDate(),
  body('documents').optional(),
  body('terms').optional({ nullable: true }).isString(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createLeaseValidators, updateLeaseValidators, idParamValidators };
