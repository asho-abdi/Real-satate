import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { reservationsController as ctrl } from './controller.js';
import {
  createReservationValidators,
  updateReservationValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('reservations:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('reservations:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('reservations:create'), createReservationValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('reservations:update'), updateReservationValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('reservations:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

router.post(
  '/:id/check-in',
  authorize('reservations:update'),
  idParamValidators,
  validate,
  asyncHandler(ctrl.checkIn),
);

router.post(
  '/:id/check-out',
  authorize('reservations:update'),
  idParamValidators,
  validate,
  asyncHandler(ctrl.checkOut),
);

export default router;
