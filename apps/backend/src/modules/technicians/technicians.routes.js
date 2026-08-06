import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { techniciansController as ctrl } from './controller.js';
import {
  createTechnicianValidators,
  updateTechnicianValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('technicians:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('technicians:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('technicians:create'), createTechnicianValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('technicians:update'), updateTechnicianValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('technicians:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
