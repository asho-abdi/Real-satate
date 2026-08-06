import prisma from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from '../../utils/pagination.js';
import { userRoleInclude } from '../../repositories/user.repository.js';

const userSafeSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  isActive: true,
  emailVerifiedAt: true,
  roleId: true,
  lastLoginAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
};

export async function listUsers(query = {}) {
  const parsed = parsePaginationQuery(query, {
    defaultSort: 'createdAt',
    allowedSorts: ['createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'isActive'],
    filterKeys: ['roleId', 'isActive'],
  });

  const where = { deletedAt: null };
  if (parsed.filters.roleId) where.roleId = parsed.filters.roleId;
  if (parsed.filters.isActive !== undefined && parsed.filters.isActive !== '') {
    where.isActive = parsed.filters.isActive === 'true' || parsed.filters.isActive === true;
  }
  if (parsed.search) {
    where.OR = [
      { email: { contains: parsed.search, mode: 'insensitive' } },
      { firstName: { contains: parsed.search, mode: 'insensitive' } },
      { lastName: { contains: parsed.search, mode: 'insensitive' } },
      { phone: { contains: parsed.search, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      select: userSafeSelect,
    }),
  ]);

  return {
    data,
    meta: buildPaginationMeta(total, { page: parsed.page, limit: parsed.limit }),
  };
}

export async function findUserById(id) {
  const row = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userSafeSelect,
  });
  if (!row) throw new AppError('User not found', 404, { code: 'NOT_FOUND' });
  return row;
}

export async function createUser(data) {
  const created = await prisma.user.create({
    data,
    select: userSafeSelect,
  });
  return created;
}

export async function updateUserRecord(id, data) {
  await findUserById(id);
  return prisma.user.update({
    where: { id },
    data,
    select: userSafeSelect,
  });
}

export async function deactivateUser(id) {
  await findUserById(id);
  return prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
    select: userSafeSelect,
  });
}

export { userSafeSelect, userRoleInclude };

export default {
  listUsers,
  findUserById,
  createUser,
  updateUserRecord,
  deactivateUser,
};
