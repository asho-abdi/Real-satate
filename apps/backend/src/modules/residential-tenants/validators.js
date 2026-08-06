import { body, param } from 'express-validator';

const STATUSES = ['INQUIRY', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'LEASE_SIGNED', 'MOVED_IN', 'MOVED_OUT'];

export const createResidentialTenantValidators = [
  body('firstName').trim().notEmpty().withMessage('firstName is required'),
  body('lastName').trim().notEmpty().withMessage('lastName is required'),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('idNumber').optional({ nullable: true }).isString(),
  body('nationality').optional({ nullable: true }).isString(),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('status').optional().isIn(STATUSES),
  body('moveInDate').optional({ nullable: true }).isISO8601().toDate(),
  body('moveOutDate').optional({ nullable: true }).isISO8601().toDate(),
  body('notes').optional({ nullable: true }).isString(),
  body('documents').optional(),
];

export const updateResidentialTenantValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('idNumber').optional({ nullable: true }).isString(),
  body('nationality').optional({ nullable: true }).isString(),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('status').optional().isIn(STATUSES),
  body('moveInDate').optional({ nullable: true }).isISO8601().toDate(),
  body('moveOutDate').optional({ nullable: true }).isISO8601().toDate(),
  body('notes').optional({ nullable: true }).isString(),
  body('documents').optional(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createResidentialTenantValidators, updateResidentialTenantValidators, idParamValidators };
