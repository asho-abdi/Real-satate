import prisma from '../config/database.js';

export async function createRefreshToken({ userId, tokenHash, expiresAt }) {
  return prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

export async function findValidRefreshToken(tokenHash) {
  return prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export async function revokeRefreshToken(tokenHash) {
  const existing = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null },
  });
  if (!existing) return null;
  return prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export default {
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};
