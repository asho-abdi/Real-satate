import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { residentialTenantsController as ctrl } from './controller.js';
import {
  createResidentialTenantValidators,
  updateResidentialTenantValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('residential-tenants:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('residential-tenants:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('residential-tenants:create'), createResidentialTenantValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('residential-tenants:update'), updateResidentialTenantValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('residential-tenants:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
