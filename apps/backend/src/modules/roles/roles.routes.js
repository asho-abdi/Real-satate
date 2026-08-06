import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { rolesController as ctrl } from './controller.js';
import { idParamValidators, updateRolePermissionsValidators } from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('roles:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('roles:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.patch(
  '/:id/permissions',
  authorize('roles:update'),
  updateRolePermissionsValidators,
  validate,
  asyncHandler(ctrl.updatePermissions),
);

export default router;
