import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { uploadDocument } from '../../middlewares/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { assertUnitBuildingAccess } from '../../services/access.service.js';
import { logActivity } from '../../services/activity.service.js';
import { assertSafeUploadedFile } from '../../utils/fileMagic.js';

const router = Router();
router.use(authenticate);

const VALID_TYPES = new Set(['UNIT', 'BUSINESS', 'TENANT', 'SHOP_SALE', 'BOOKING']);
const VALID_CATEGORIES = new Set([
  'LEASE_AGREEMENT',
  'RENEWAL_AGREEMENT',
  'TERMINATION_AGREEMENT',
  'PAYMENT_RECEIPT',
  'IDENTITY',
  'OTHER',
]);

router.get(
  '/',
  authorize('units:read'),
  asyncHandler(async (req, res) => {
    const { entityType, entityId, unitId } = req.query;
    const buildingIds = req.user.buildingIds;

    if (unitId) {
      await assertUnitBuildingAccess(req.user, String(unitId), buildingIds);
    }

    const where = {
      deletedAt: null,
      ...(unitId ? { unitId: String(unitId) } : {}),
      ...(entityType && entityId
        ? { entityType: String(entityType).toUpperCase(), entityId: String(entityId) }
        : {}),
      // Building managers only see documents tied to their buildings
      ...(buildingIds !== null
        ? {
            unit: { buildingId: { in: buildingIds }, deletedAt: null },
          }
        : {}),
    };
    const rows = await prisma.entityDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return success(res, rows);
  }),
);

router.post(
  '/',
  authorize('units:update'),
  uploadDocument.single('file'),
  asyncHandler(async (req, res) => {
    const {
      entityType = 'UNIT',
      entityId,
      unitId,
      category = 'OTHER',
      notes,
    } = req.body || {};

    if (!req.file) throw new AppError('No file uploaded', 400);
    if (!entityId) throw new AppError('entityId is required', 400);

    assertSafeUploadedFile(req.file.path, 'document');

    const type = String(entityType).toUpperCase();
    if (!VALID_TYPES.has(type)) throw new AppError('Invalid entityType', 400);
    const cat = String(category).toUpperCase();
    if (!VALID_CATEGORIES.has(cat)) throw new AppError('Invalid category', 400);

    let resolvedUnitId = unitId || null;
    if (type === 'UNIT') {
      resolvedUnitId = entityId;
      await assertUnitBuildingAccess(req.user, entityId, req.user.buildingIds);
    } else if (resolvedUnitId) {
      await assertUnitBuildingAccess(req.user, resolvedUnitId, req.user.buildingIds);
    } else if (req.user.buildingIds !== null) {
      // Non-admin uploads must be tied to an accessible unit
      throw new AppError('unitId is required for this document', 400);
    }

    const url = `/api/v1/files/documents/${req.file.filename}`;
    const doc = await prisma.entityDocument.create({
      data: {
        entityType: type,
        entityId,
        unitId: resolvedUnitId,
        category: cat,
        filename: req.file.filename,
        originalName: req.file.originalname,
        url,
        mimeType: req.file.mimetype,
        size: req.file.size,
        notes: notes ? String(notes).trim() : null,
        uploadedById: req.user.id || null,
      },
    });

    await logActivity({
      entityType: type,
      entityId,
      unitId: resolvedUnitId,
      action: 'DOCUMENT_UPLOADED',
      summary: `Document uploaded: ${req.file.originalname || req.file.filename}`,
      meta: { category: cat, documentId: doc.id },
      actorId: req.user.id,
    });

    return success(res, doc, 201);
  }),
);

router.delete(
  '/:id',
  authorize('units:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.entityDocument.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!existing) throw new AppError('Document not found', 404);
    if (existing.unitId) {
      await assertUnitBuildingAccess(req.user, existing.unitId, req.user.buildingIds);
    }
    await prisma.entityDocument.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
