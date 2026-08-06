import { body, param } from 'express-validator';

export const createAmenityValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('description').optional({ nullable: true }).isString(),
  body('scope').optional().isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateAmenityValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('name').optional().trim().notEmpty(),
  body('description').optional({ nullable: true }).isString(),
  body('scope').optional().isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createAmenityValidators, updateAmenityValidators, idParamValidators };
