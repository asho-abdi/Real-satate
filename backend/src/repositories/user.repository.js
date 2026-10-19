import prisma from '../config/database.js';

const userAccessInclude = {
  roleRef: true,
  buildings: {
    include: {
      building: { select: { id: true, code: true, name: true, deletedAt: true } },
    },
  },
};

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: userAccessInclude,
  });
}

export async function findUserByIdWithRole(id) {
  return prisma.user.findUnique({
    where: { id },
    include: userAccessInclude,
  });
}

export async function findUserByResetToken(token) {
  return prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { gt: new Date() },
    },
    include: userAccessInclude,
  });
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}

export async function touchLastLogin(id, when = new Date()) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: when },
  });
}

export default {
  findUserByEmail,
  findUserByIdWithRole,
  findUserByResetToken,
  updateUser,
  touchLastLogin,
};
