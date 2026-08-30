import { query } from 'express-validator';

const EXPORT_TYPES = [
  'dashboard',
  'occupancy',
  'revenue',
  'financial',
  'building',
  'unit',
  'tenant',
  'maintenance',
];

export const exportTypeValidators = [
  query('type')
    .optional()
    .isIn(EXPORT_TYPES)
    .withMessage(`type must be one of: ${EXPORT_TYPES.join(', ')}`),
];

export default { exportTypeValidators };
