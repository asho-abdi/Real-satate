import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notificationsController as ctrl } from './controller.js';
import { idParamValidators } from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('notifications:read'), asyncHandler(ctrl.list));
router.patch('/read-all', authorize('notifications:update'), asyncHandler(ctrl.markAllRead));
router.patch('/:id/read', authorize('notifications:update'), idParamValidators, validate, asyncHandler(ctrl.markRead));

export default router;
