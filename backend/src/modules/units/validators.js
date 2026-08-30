import { body, param } from 'express-validator';

const STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
const CLEANING = ['CLEAN', 'DIRTY', 'CLEANING_IN_PROGRESS', 'INSPECTED'];
const MODES = ['RESIDENTIAL', 'COMMERCIAL', 'AIRBNB'];

export const createUnitValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('name').optional({ nullable: true }).isString(),
  body('buildingId').isUUID().withMessage('buildingId is required'),
  body('floorId').isUUID().withMessage('floorId is required'),
  body('categoryId').optional({ nullable: true }).isUUID(),
  body('typeId').optional({ nullable: true }).isUUID(),
  body('occupancyMode').isIn(MODES).withMessage('occupancyMode is required'),
  body('status').optional().isIn(STATUSES),
  body('cleaningStatus').optional().isIn(CLEANING),
  body('bedrooms').optional({ nullable: true }).isInt({ min: 0 }),
  body('bathrooms').optional({ nullable: true }).isFloat({ min: 0 }),
  body('kitchens').optional({ nullable: true }).isInt({ min: 0 }),
  body('parking').optional({ nullable: true }).isInt({ min: 0 }),
  body('areaSqm').optional({ nullable: true }).isFloat({ min: 0 }),
  body('rentPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('dailyRate').optional({ nullable: true }).isFloat({ min: 0 }),
  body('description').optional({ nullable: true }).isString(),
  body('amenities').optional(),
  body('featured').optional().isBoolean().toBoolean(),
];

export const updateUnitValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('name').optional({ nullable: true }).isString(),
  body('buildingId').optional().isUUID(),
  body('floorId').optional().isUUID(),
  body('categoryId').optional({ nullable: true }).isUUID(),
  body('typeId').optional({ nullable: true }).isUUID(),
  body('occupancyMode').optional().isIn(MODES),
  body('status').optional().isIn(STATUSES),
  body('cleaningStatus').optional().isIn(CLEANING),
  body('bedrooms').optional({ nullable: true }).isInt({ min: 0 }),
  body('bathrooms').optional({ nullable: true }).isFloat({ min: 0 }),
  body('kitchens').optional({ nullable: true }).isInt({ min: 0 }),
  body('parking').optional({ nullable: true }).isInt({ min: 0 }),
  body('areaSqm').optional({ nullable: true }).isFloat({ min: 0 }),
  body('rentPrice').optional({ nullable: true }).isFloat({ min: 0 }),
  body('dailyRate').optional({ nullable: true }).isFloat({ min: 0 }),
  body('description').optional({ nullable: true }).isString(),
  body('amenities').optional(),
  body('featured').optional().isBoolean().toBoolean(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export const imageParamValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  param('imageId').isUUID().withMessage('Valid imageId is required'),
];

export default {
  createUnitValidators,
  updateUnitValidators,
  idParamValidators,
  imageParamValidators,
};
