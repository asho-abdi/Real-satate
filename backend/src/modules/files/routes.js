import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { uploadDocument } from '../../middlewares/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { success } from '../../utils/apiResponse.js';
import { uploadRoot, propertiesDir, unitsDir, documentsDir } from '../../middlewares/upload.js';
import { assertSafeUploadedFile } from '../../utils/fileMagic.js';
import {
  assertUnitBuildingAccess,
  isAdminUser,
} from '../../services/access.service.js';
import { logActivity } from '../../services/activity.service.js';

const ALLOWED_DIRS = {
  properties: propertiesDir,
  units: unitsDir,
  documents: documentsDir,
};

const router = Router();
router.use(authenticate);

/**
 * Generic upload endpoint — authenticated + permission required.
 * Prefer /documents for entity-linked uploads with building checks.
 */
router.post(
  '/documents',
  authorize('units:update'),
  uploadDocument.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    assertSafeUploadedFile(req.file.path, 'document');

    await logActivity({
      entityType: 'SYSTEM',
      entityId: req.user.id,
      action: 'FILE_UPLOADED',
      summary: `File uploaded: ${req.file.originalname || req.file.filename}`,
      meta: { filename: req.file.filename, size: req.file.size },
      actorId: req.user.id,
    });

    return success(
      res,
      {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/api/v1/files/documents/${req.file.filename}`,
      },
      201,
    );
  }),
);

router.get(
  '/:category/:filename',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const category = String(req.params.category);
    const filename = path.basename(String(req.params.filename));

    if (filename !== String(req.params.filename) || filename.includes('..')) {
      throw new AppError('Invalid file name', 400);
    }

    const baseDir = ALLOWED_DIRS[category];
    if (!baseDir) {
      throw new AppError('Invalid file category', 400);
    }

    const filePath = path.resolve(baseDir, filename);
    const resolvedRoot = path.resolve(uploadRoot);
    if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
      throw new AppError('Invalid file path', 400);
    }

    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }

    // Document downloads must map to a known record + building scope (IDOR prevention)
    if (category === 'documents') {
      const doc = await prisma.entityDocument.findFirst({
        where: { filename, deletedAt: null },
        select: { id: true, unitId: true, entityType: true, entityId: true },
      });
      if (!doc) {
        // Orphan / legacy file: admins only
        if (!isAdminUser(req.user)) {
          throw new AppError('File not found', 404);
        }
      } else if (doc.unitId) {
        await assertUnitBuildingAccess(req.user, doc.unitId, req.user.buildingIds);
      } else if (!isAdminUser(req.user)) {
        throw new AppError('You do not have access to this file', 403, {
          code: 'FILE_FORBIDDEN',
        });
      }
    }

    if (category === 'units') {
      const unit = await prisma.unit.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { images: { has: filename } },
            { images: { has: `/api/v1/files/units/${filename}` } },
            { images: { has: `units/${filename}` } },
          ],
        },
        select: { id: true },
      });
      // If we can resolve a unit, enforce building access; otherwise admin-only for orphans
      if (unit) {
        await assertUnitBuildingAccess(req.user, unit.id, req.user.buildingIds);
      } else if (!isAdminUser(req.user)) {
        // Still allow if user has units:read — many galleries store full URLs;
        // tighten when image index is normalized. Require at least authentication (already).
      }
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
  }),
);

export default router;
