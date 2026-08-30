import { body, param } from 'express-validator';

const STATUSES = ['INQUIRY', 'VERIFICATION', 'NEGOTIATION', 'APPROVED', 'ALLOCATED', 'OPERATING', 'RENEWAL', 'CLOSED'];

export const createCommercialTenantValidators = [
  body('companyName').trim().notEmpty().withMessage('companyName is required'),
  body('contactName').trim().notEmpty().withMessage('contactName is required'),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('licenseNumber').optional({ nullable: true }).isString(),
  body('taxId').optional({ nullable: true }).isString(),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('status').optional().isIn(STATUSES),
  body('notes').optional({ nullable: true }).isString(),
  body('documents').optional(),
];

export const updateCommercialTenantValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('companyName').optional().trim().notEmpty(),
  body('contactName').optional().trim().notEmpty(),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('licenseNumber').optional({ nullable: true }).isString(),
  body('taxId').optional({ nullable: true }).isString(),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('status').optional().isIn(STATUSES),
  body('notes').optional({ nullable: true }).isString(),
  body('documents').optional(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createCommercialTenantValidators, updateCommercialTenantValidators, idParamValidators };
