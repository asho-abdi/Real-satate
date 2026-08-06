import { body, param } from 'express-validator';

const MODES = ['RESIDENTIAL', 'COMMERCIAL', 'AIRBNB'];

export const createUnitTypeValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('occupancyMode').isIn(MODES).withMessage('occupancyMode is required'),
  body('description').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateUnitTypeValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('name').optional().trim().notEmpty(),
  body('occupancyMode').optional().isIn(MODES),
  body('description').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createUnitTypeValidators, updateUnitTypeValidators, idParamValidators };
