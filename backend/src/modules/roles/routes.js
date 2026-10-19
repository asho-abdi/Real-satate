import { Router } from 'express';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { requireAdmin } from '../../middlewares/buildingAccess.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get(
  '/',
  authorize('roles:read'),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    return success(
      res,
      roles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissions: r.permissions.map((rp) => ({
          id: rp.permission.id,
          code: rp.permission.code,
          name: rp.permission.name,
          resource: rp.permission.resource,
          action: rp.permission.action,
        })),
      })),
    );
  }),
);

router.get(
  '/permissions',
  authorize('roles:read'),
  asyncHandler(async (_req, res) => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    return success(res, permissions);
  }),
);

router.get(
  '/:id',
  authorize('roles:read'),
  asyncHandler(async (req, res) => {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new AppError('Role not found', 404);
    return success(res, {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    });
  }),
);

router.put(
  '/:id/permissions',
  authorize('roles:update'),
  asyncHandler(async (req, res) => {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) throw new AppError('Role not found', 404);
    if (role.code === 'ADMIN') {
      throw new AppError('Admin permissions cannot be changed', 400);
    }

    const permissionIds = [...new Set((req.body?.permissionIds || []).map(String).filter(Boolean))];
    if (permissionIds.length) {
      const count = await prisma.permission.count({ where: { id: { in: permissionIds } } });
      if (count !== permissionIds.length) {
        throw new AppError('One or more permissions were not found', 400);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissionIds.length) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    });

    const updated = await prisma.role.findUnique({
      where: { id: role.id },
      include: { permissions: { include: { permission: true } } },
    });

    return success(res, {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      permissions: updated.permissions.map((rp) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        name: rp.permission.name,
      })),
    });
  }),
);

export default router;
