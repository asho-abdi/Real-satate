import { body, param } from 'express-validator';

export const createUserValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('firstName is required'),
  body('lastName').trim().notEmpty().withMessage('lastName is required'),
  body('roleId').isUUID().withMessage('roleId is required'),
  body('phone').optional({ nullable: true }).isString(),
  body('avatar').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateUserValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('roleId').optional().isUUID(),
  body('phone').optional({ nullable: true }).isString(),
  body('avatar').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createUserValidators, updateUserValidators, idParamValidators };
