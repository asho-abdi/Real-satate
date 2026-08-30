import { body, param } from 'express-validator';

export const createTechnicianValidators = [
  body('firstName').trim().notEmpty().withMessage('firstName is required'),
  body('lastName').trim().notEmpty().withMessage('lastName is required'),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('specialization').optional({ nullable: true }).isString(),
  body('userId').optional({ nullable: true }).isUUID(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateTechnicianValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('specialization').optional({ nullable: true }).isString(),
  body('userId').optional({ nullable: true }).isUUID(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createTechnicianValidators, updateTechnicianValidators, idParamValidators };
