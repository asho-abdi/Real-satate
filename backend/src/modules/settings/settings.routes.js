import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { settingsController as ctrl } from './controller.js';
import { keyParamValidators, upsertSettingValidators } from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('settings:read'), asyncHandler(ctrl.list));
router.get('/:key', authorize('settings:read'), keyParamValidators, validate, asyncHandler(ctrl.getByKey));
router.put('/:key', authorize('settings:update'), upsertSettingValidators, validate, asyncHandler(ctrl.upsert));
router.patch('/:key', authorize('settings:update'), upsertSettingValidators, validate, asyncHandler(ctrl.upsert));

export default router;
