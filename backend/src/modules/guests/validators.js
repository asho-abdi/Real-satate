import { body, param } from 'express-validator';

export const createGuestValidators = [
  body('firstName').trim().notEmpty().withMessage('firstName is required'),
  body('lastName').trim().notEmpty().withMessage('lastName is required'),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('nationality').optional({ nullable: true }).isString(),
  body('idType').optional({ nullable: true }).isString(),
  body('idNumber').optional({ nullable: true }).isString(),
];

export const updateGuestValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional({ nullable: true }).isEmail(),
  body('phone').optional({ nullable: true }).isString(),
  body('nationality').optional({ nullable: true }).isString(),
  body('idType').optional({ nullable: true }).isString(),
  body('idNumber').optional({ nullable: true }).isString(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createGuestValidators, updateGuestValidators, idParamValidators };
