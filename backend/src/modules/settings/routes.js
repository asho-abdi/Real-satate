import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    const map = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return success(res, map);
  }),
);

router.put(
  '/:key',
  authorize('settings:update'),
  asyncHandler(async (req, res) => {
    const key = String(req.params.key);
    if (!key) throw new AppError('key is required', 400);

    const value = req.body?.value !== undefined ? req.body.value : req.body;
    if (value === undefined) throw new AppError('value is required', 400);

    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    return success(res, setting);
  }),
);

export default router;
