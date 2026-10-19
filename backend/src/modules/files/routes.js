import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { uploadDocument } from '../../middlewares/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { success } from '../../utils/apiResponse.js';
import { uploadRoot, propertiesDir, unitsDir, documentsDir } from '../../middlewares/upload.js';

const ALLOWED_DIRS = {
  properties: propertiesDir,
  units: unitsDir,
  documents: documentsDir,
};

const router = Router();
router.use(authenticate);

router.post(
  '/documents',
  uploadDocument.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    return success(res, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/api/v1/files/documents/${req.file.filename}`,
    }, 201);
  }),
);

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
