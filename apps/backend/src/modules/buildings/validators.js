import { body, param } from 'express-validator';

export const createBuildingValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('address').trim().notEmpty().withMessage('address is required'),
  body('city').trim().notEmpty().withMessage('city is required'),
  body('country').optional().trim().notEmpty(),
  body('managerName').optional({ nullable: true }).isString(),
  body('floorsCount').optional().isInt({ min: 0 }),
  body('unitsCount').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateBuildingValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('name').optional().trim().notEmpty(),
  body('address').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('country').optional().trim().notEmpty(),
  body('managerName').optional({ nullable: true }).isString(),
  body('floorsCount').optional().isInt({ min: 0 }),
  body('unitsCount').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createBuildingValidators, updateBuildingValidators, idParamValidators };
