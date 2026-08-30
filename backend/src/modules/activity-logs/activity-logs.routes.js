import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { activityLogsController as ctrl } from './controller.js';

const router = Router();

router.use(authenticate);

// Seed has no activity-logs resource; use reports:read
router.get('/', authorize('reports:read'), asyncHandler(ctrl.list));

export default router;
