import { body, param } from 'express-validator';

const STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'];
const CLEANING = ['CLEAN', 'DIRTY', 'CLEANING_IN_PROGRESS', 'INSPECTED'];

export const createReservationValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('unitId').isUUID().withMessage('unitId is required'),
  body('guestId').isUUID().withMessage('guestId is required'),
  body('status').optional().isIn(STATUSES),
  body('cleaningStatus').optional().isIn(CLEANING),
  body('checkInDate').isISO8601().withMessage('checkInDate is required').toDate(),
  body('checkOutDate').isISO8601().withMessage('checkOutDate is required').toDate(),
  body('adults').optional().isInt({ min: 1 }),
  body('children').optional().isInt({ min: 0 }),
  body('nightlyRate').isFloat({ min: 0 }).withMessage('nightlyRate is required'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('totalAmount is required'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('notes').optional({ nullable: true }).isString(),
];

export const updateReservationValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('unitId').optional().isUUID(),
  body('guestId').optional().isUUID(),
  body('status').optional().isIn(STATUSES),
  body('cleaningStatus').optional().isIn(CLEANING),
  body('checkInDate').optional().isISO8601().toDate(),
  body('checkOutDate').optional().isISO8601().toDate(),
  body('adults').optional().isInt({ min: 1 }),
  body('children').optional().isInt({ min: 0 }),
  body('nightlyRate').optional().isFloat({ min: 0 }),
  body('totalAmount').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('notes').optional({ nullable: true }).isString(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default {
  createReservationValidators,
  updateReservationValidators,
  idParamValidators,
};
