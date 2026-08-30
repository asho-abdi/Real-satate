import { body, param } from 'express-validator';

const MODES = ['RESIDENTIAL', 'COMMERCIAL', 'AIRBNB'];

export const createUnitCategoryValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('occupancyMode').isIn(MODES).withMessage('occupancyMode is required'),
  body('description').optional({ nullable: true }).isString(),
  body('baseRate').isFloat({ min: 0 }).withMessage('baseRate is required'),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateUnitCategoryValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('name').optional().trim().notEmpty(),
  body('occupancyMode').optional().isIn(MODES),
  body('description').optional({ nullable: true }).isString(),
  body('baseRate').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createUnitCategoryValidators, updateUnitCategoryValidators, idParamValidators };
