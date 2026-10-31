import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { requireAdmin } from '../../middlewares/buildingAccess.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { success } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { sanitizeUser } from '../../services/auth.service.js';
import {
  DEFAULT_STAFF_PAGES,
  normalizeAllowedPages,
} from '../../constants/pageAccess.js';
import { validatePasswordStrength } from '../../utils/passwordPolicy.js';
import { logActivity } from '../../services/activity.service.js';
import * as refreshTokenRepo from '../../repositories/refreshToken.repository.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

const userInclude = {
  roleRef: true,
  buildings: {
    include: {
      building: { select: { id: true, code: true, name: true, deletedAt: true } },
    },
  },
};

async function serializeManagedUser(user) {
  return sanitizeUser(user);
}

router.get(
  '/',
  authorize('users:read'),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
    const data = await Promise.all(users.map(serializeManagedUser));
    return success(res, data);
  }),
);

router.get(
  '/:id',
  authorize('users:read'),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: userInclude,
    });
    if (!user) throw new AppError('User not found', 404);
    return success(res, await serializeManagedUser(user));
  }),
);

router.post(
  '/',
  authorize('users:create'),
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      roleId,
      roleCode,
      buildingIds = [],
      allowedPages,
      isActive = true,
    } = req.body || {};

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('email, password, firstName, and lastName are required', 400);
    }

    const strength = validatePasswordStrength(password);
    if (!strength.ok) throw new AppError(strength.message, 400, { code: 'WEAK_PASSWORD' });

    const role = roleId
      ? await prisma.role.findUnique({ where: { id: roleId } })
      : await prisma.role.findUnique({
          where: { code: String(roleCode || 'BUILDING_MANAGER').toUpperCase() },
        });
    if (!role) throw new AppError('Role not found', 400);

    const exists = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (exists) throw new AppError('Email already in use', 409);

    const uniqueBuildingIds = [...new Set((buildingIds || []).map(String).filter(Boolean))];
    if (role.code === 'BUILDING_MANAGER' && uniqueBuildingIds.length === 0) {
      throw new AppError('Assign at least one building this user can manage', 400);
    }

    if (uniqueBuildingIds.length) {
      const count = await prisma.building.count({
        where: { id: { in: uniqueBuildingIds }, deletedAt: null },
      });
      if (count !== uniqueBuildingIds.length) {
        throw new AppError('One or more buildings were not found', 400);
      }
    }

    const pages =
      role.code === 'ADMIN'
        ? []
        : normalizeAllowedPages(
            allowedPages !== undefined ? allowedPages : DEFAULT_STAFF_PAGES,
          );
    if (role.code === 'BUILDING_MANAGER' && pages.length === 0) {
      throw new AppError('Select at least one page this user can open', 400);
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        passwordHash,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: phone ? String(phone).trim() : null,
        isActive: Boolean(isActive),
        role: role.code,
        roleId: role.id,
        allowedPages: role.code === 'ADMIN' ? [] : pages,
        buildings:
          role.code === 'ADMIN'
            ? undefined
            : {
                create: uniqueBuildingIds.map((buildingId) => ({ buildingId })),
              },
      },
      include: userInclude,
    });

    await logActivity({
      entityType: 'USER',
      entityId: user.id,
      action: 'USER_CREATED',
      summary: `User created: ${user.email}`,
      meta: { role: role.code, buildings: uniqueBuildingIds.length, pages },
      actorId: req.user.id,
    });

    return success(res, await serializeManagedUser(user), 201);
  }),
);

router.patch(
  '/:id',
  authorize('users:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('User not found', 404);

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      roleId,
      roleCode,
      buildingIds,
      allowedPages,
      isActive,
    } = req.body || {};

    let role = null;
    if (roleId || roleCode) {
      role = roleId
        ? await prisma.role.findUnique({ where: { id: roleId } })
        : await prisma.role.findUnique({ where: { code: String(roleCode).toUpperCase() } });
      if (!role) throw new AppError('Role not found', 400);
    }

    if (email && String(email).toLowerCase().trim() !== existing.email) {
      const clash = await prisma.user.findUnique({
        where: { email: String(email).toLowerCase().trim() },
      });
      if (clash) throw new AppError('Email already in use', 409);
    }

    const nextRoleCode = role?.code || existing.role;
    let nextBuildingIds = buildingIds;
    let nextPages = allowedPages;

    if (nextBuildingIds !== undefined) {
      nextBuildingIds = [...new Set((nextBuildingIds || []).map(String).filter(Boolean))];
      if (nextRoleCode === 'BUILDING_MANAGER' && nextBuildingIds.length === 0) {
        throw new AppError('Assign at least one building this user can manage', 400);
      }
      if (nextBuildingIds.length) {
        const count = await prisma.building.count({
          where: { id: { in: nextBuildingIds }, deletedAt: null },
        });
        if (count !== nextBuildingIds.length) {
          throw new AppError('One or more buildings were not found', 400);
        }
      }
    }

    if (nextPages !== undefined) {
      nextPages = nextRoleCode === 'ADMIN' ? [] : normalizeAllowedPages(nextPages);
      if (nextRoleCode === 'BUILDING_MANAGER' && nextPages.length === 0) {
        throw new AppError('Select at least one page this user can open', 400);
      }
    } else if (role && role.code === 'ADMIN') {
      nextPages = [];
    }

    const data = {
      ...(email !== undefined && { email: String(email).toLowerCase().trim() }),
      ...(firstName !== undefined && { firstName: String(firstName).trim() }),
      ...(lastName !== undefined && { lastName: String(lastName).trim() }),
      ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(role && { role: role.code, roleId: role.id }),
      ...(nextPages !== undefined && { allowedPages: nextPages }),
    };

    if (password) {
      const strength = validatePasswordStrength(password);
      if (!strength.ok) throw new AppError(strength.message, 400, { code: 'WEAK_PASSWORD' });
      data.passwordHash = await bcrypt.hash(String(password), 12);
    }

    // Prevent self privilege escalation through this admin endpoint accidentally
    if (req.user.id === existing.id && role && role.code !== existing.role) {
      throw new AppError('You cannot change your own role', 400, { code: 'SELF_ROLE_CHANGE' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: existing.id },
        data,
      });

      if (nextBuildingIds !== undefined) {
        await tx.userBuilding.deleteMany({ where: { userId: existing.id } });
        if (nextRoleCode !== 'ADMIN' && nextBuildingIds.length) {
          await tx.userBuilding.createMany({
            data: nextBuildingIds.map((buildingId) => ({
              userId: existing.id,
              buildingId,
            })),
          });
        }
      } else if (role && role.code === 'ADMIN') {
        await tx.userBuilding.deleteMany({ where: { userId: existing.id } });
      }

      return tx.user.findUnique({
        where: { id: updated.id },
        include: userInclude,
      });
    });

    // Role / page / password / building changes invalidate active sessions
    if (role || nextPages !== undefined || nextBuildingIds !== undefined || password) {
      await refreshTokenRepo.revokeAllUserRefreshTokens(existing.id);
    }

    await logActivity({
      entityType: 'USER',
      entityId: existing.id,
      action: 'USER_UPDATED',
      summary: `User updated: ${user.email}`,
      meta: {
        roleChanged: Boolean(role),
        pagesChanged: nextPages !== undefined,
        buildingsChanged: nextBuildingIds !== undefined,
        passwordRotated: Boolean(password),
      },
      actorId: req.user.id,
    });

    return success(res, await serializeManagedUser(user));
  }),
);

router.put(
  '/:id/buildings',
  authorize('users:update'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { roleRef: true },
    });
    if (!existing) throw new AppError('User not found', 404);

    const roleCode = existing.roleRef?.code || existing.role;
    if (roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN') {
      throw new AppError('Admin users have access to all buildings', 400);
    }

    const buildingIds = [...new Set((req.body?.buildingIds || []).map(String).filter(Boolean))];
    if (buildingIds.length === 0) {
      throw new AppError('At least one building is required', 400);
    }

    const count = await prisma.building.count({
      where: { id: { in: buildingIds }, deletedAt: null },
    });
    if (count !== buildingIds.length) {
      throw new AppError('One or more buildings were not found', 400);
    }

    const user = await prisma.$transaction(async (tx) => {
      await tx.userBuilding.deleteMany({ where: { userId: existing.id } });
      await tx.userBuilding.createMany({
        data: buildingIds.map((buildingId) => ({
          userId: existing.id,
          buildingId,
        })),
      });
      return tx.user.findUnique({
        where: { id: existing.id },
        include: userInclude,
      });
    });

    return success(res, await serializeManagedUser(user));
  }),
);

router.delete(
  '/:id',
  authorize('users:delete'),
  asyncHandler(async (req, res) => {
    if (req.user.id === req.params.id) {
      throw new AppError('You cannot delete your own account', 400);
    }
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('User not found', 404);

    await prisma.user.delete({ where: { id: existing.id } });
    return success(res, { id: existing.id, deleted: true });
  }),
);

export default router;
