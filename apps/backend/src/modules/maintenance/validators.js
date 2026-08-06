import { body, param } from 'express-validator';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_VERIFICATION',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
];

export const createMaintenanceValidators = [
  body('code').trim().notEmpty().withMessage('code is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('description').optional({ nullable: true }).isString(),
  body('buildingId').optional({ nullable: true }).isUUID(),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('priority').optional().isIn(PRIORITIES),
  body('status').optional().isIn(STATUSES),
  body('technicianId').optional({ nullable: true }).isUUID(),
  body('assigneeId').optional({ nullable: true }).isUUID(),
  body('cost').optional({ nullable: true }).isFloat({ min: 0 }),
];

export const updateMaintenanceValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('code').optional().trim().notEmpty(),
  body('title').optional().trim().notEmpty(),
  body('description').optional({ nullable: true }).isString(),
  body('buildingId').optional({ nullable: true }).isUUID(),
  body('unitId').optional({ nullable: true }).isUUID(),
  body('priority').optional().isIn(PRIORITIES),
  body('status').optional().isIn(STATUSES),
  body('technicianId').optional({ nullable: true }).isUUID(),
  body('assigneeId').optional({ nullable: true }).isUUID(),
  body('cost').optional({ nullable: true }).isFloat({ min: 0 }),
  body('resolvedAt').optional({ nullable: true }).isISO8601().toDate(),
  body('closedAt').optional({ nullable: true }).isISO8601().toDate(),
];

export const assignMaintenanceValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('technicianId').isUUID().withMessage('technicianId is required'),
  body('assigneeId').optional({ nullable: true }).isUUID(),
];

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default {
  createMaintenanceValidators,
  updateMaintenanceValidators,
  assignMaintenanceValidators,
  idParamValidators,
};
