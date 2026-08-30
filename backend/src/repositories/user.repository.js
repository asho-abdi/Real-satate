import prisma from '../config/database.js';

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

export async function findUserByIdWithRole(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByResetToken(token) {
  return prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { gt: new Date() },
    },
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
