import { body, param } from 'express-validator';

export const createFloorValidators = [
  body('buildingId').isUUID().withMessage('buildingId is required'),
  body('floorNumber').isInt().withMessage('floorNumber is required'),
  body('name').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateFloorValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('buildingId').optional().isUUID(),
  body('floorNumber').optional().isInt(),
  body('name').optional({ nullable: true }).isString(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { createFloorValidators, updateFloorValidators, idParamValidators };
