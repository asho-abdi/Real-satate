import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { usersController as ctrl } from './controller.js';
import { createUserValidators, updateUserValidators, idParamValidators } from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('users:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('users:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('users:create'), createUserValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('users:update'), updateUserValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('users:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
