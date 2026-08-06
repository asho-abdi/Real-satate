import prisma from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from '../../utils/pagination.js';

const roleInclude = {
  rolePermissions: {
    include: {
      permission: true,
    },
  },
};

export async function listRoles(query = {}) {
  const parsed = parsePaginationQuery(query, {
    defaultSort: 'name',
    defaultOrder: 'asc',
    allowedSorts: ['name', 'createdAt', 'updatedAt'],
    filterKeys: [],
  });

  const where = {};
  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: 'insensitive' } },
      { description: { contains: parsed.search, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.role.count({ where }),
    prisma.role.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: roleInclude,
    }),
  ]);

  const mapped = data.map(mapRole);
  return {
    data: mapped,
    meta: buildPaginationMeta(total, { page: parsed.page, limit: parsed.limit }),
  };
}

export async function findRoleById(id) {
  const row = await prisma.role.findUnique({
    where: { id },
    include: roleInclude,
  });
  if (!row) throw new AppError('Role not found', 404, { code: 'NOT_FOUND' });
  return mapRole(row);
}

/**
 * Replace role permissions by permission ids or permission name strings.
 * @param {string} roleId
 * @param {string[]} permissionIdsOrNames
 */
export async function updateRolePermissions(roleId, permissionIdsOrNames = []) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('Role not found', 404, { code: 'NOT_FOUND' });

  const ids = Array.isArray(permissionIdsOrNames) ? permissionIdsOrNames : [];

  if (ids.length === 0) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    return findRoleById(roleId);
  }

  const permissions = await prisma.permission.findMany({
    where: {
      OR: [
        { id: { in: ids } },
        { name: { in: ids } },
      ],
    },
  });

  const found = new Set(permissions.flatMap((p) => [p.id, p.name]));
  const missing = ids.filter((v) => !found.has(v));
  if (missing.length > 0) {
    throw new AppError('One or more permissions not found', 400, {
      code: 'INVALID_PERMISSIONS',
      details: { missing },
    });
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    }),
  ]);

  return findRoleById(roleId);
}

function mapRole(row) {
  const permissions = (row.rolePermissions || []).map((rp) => ({
    id: rp.permission.id,
    name: rp.permission.name,
    action: rp.permission.action,
    resource: rp.permission.resource,
    description: rp.permission.description,
  }));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    permissions,
  };
}

export default { listRoles, findRoleById, updateRolePermissions };
