import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { uploadRoot, propertiesDir, unitsDir, documentsDir } from '../../middlewares/upload.js';

const ALLOWED_DIRS = {
  properties: propertiesDir,
  units: unitsDir,
  documents: documentsDir,
};

const router = Router();
router.use(authenticate);

router.get(
  '/:category/:filename',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const category = String(req.params.category);
    const filename = path.basename(String(req.params.filename));

    const baseDir = ALLOWED_DIRS[category];
    if (!baseDir) {
      throw new AppError('Invalid file category', 400);
    }

    const filePath = path.resolve(baseDir, filename);
    if (!filePath.startsWith(path.resolve(uploadRoot))) {
      throw new AppError('Invalid file path', 400);
    }

    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }

    res.sendFile(filePath);
  }),
);

export default router;
