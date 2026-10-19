import crypto from 'node:crypto';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
  getTokenExpiry,
} from '../utils/tokens.js';
import { sendMail } from '../utils/mailer.js';
import * as userRepo from '../repositories/user.repository.js';
import * as refreshTokenRepo from '../repositories/refreshToken.repository.js';
import {
  getAccessibleBuildingIds,
  isAdminUser,
  loadPermissionCodes,
} from './access.service.js';

export async function mapUserPermissions(user) {
  return loadPermissionCodes(user);
}

export async function sanitizeUser(user, extras = {}) {
  if (!user) return null;
  const {
    passwordHash,
    resetPasswordToken,
    resetPasswordExpires,
    roleRef,
    buildings,
    ...rest
  } = user;

  const roleCode = roleRef?.code || user.role;
  const permissions = extras.permissions ?? (await mapUserPermissions(user));
  const buildingIds =
    extras.buildingIds !== undefined
      ? extras.buildingIds
      : await getAccessibleBuildingIds({ ...user, role: roleCode });

  return {
    ...rest,
    role: roleCode,
    roleId: user.roleId || roleRef?.id || null,
    roleName: roleRef?.name || roleCode,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    isAdmin: isAdminUser({ role: roleCode }),
    permissions,
    buildingIds,
    buildings: (buildings || []).map((ub) => ({
      id: ub.building?.id || ub.buildingId,
      code: ub.building?.code,
      name: ub.building?.name,
    })),
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokenPair(user) {
  const roleCode = user.roleRef?.code || user.role;
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: roleCode,
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  const expiresAt = getTokenExpiry(refreshToken);

  await refreshTokenRepo.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export async function login({ email, password }, ctx = {}) {
  const user = await userRepo.findUserByEmail(email);
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401, { code: 'INVALID_CREDENTIALS' });
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid email or password', 401, { code: 'INVALID_CREDENTIALS' });
  }

  await userRepo.touchLastLogin(user.id);
  const tokens = await issueTokenPair(user);

  return {
    user: await sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function logout(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }
  await refreshTokenRepo.revokeRefreshToken(hashToken(refreshToken));
  return { success: true };
}

export async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await refreshTokenRepo.findValidRefreshToken(hashToken(refreshToken));
  if (!stored?.user) {
    throw new AppError('Refresh token revoked or expired', 401);
  }

  // Reload full user with role + buildings for accurate claims
  const user = await userRepo.findUserByIdWithRole(stored.user.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or disabled', 401);
  }

  await refreshTokenRepo.revokeRefreshToken(hashToken(refreshToken));
  const tokens = await issueTokenPair(user);

  return {
    user: await sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function forgotPassword(email) {
  const user = await userRepo.findUserByEmail(email);
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    await userRepo.updateUser(user.id, {
      resetPasswordToken: hashToken(resetToken),
      resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
    });
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      text: `Reset link: ${env.FRONTEND_URL}/reset-password?token=${resetToken}`,
      html: `<p><a href="${env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset password</a></p>`,
    });
  }
  return { success: true, message: 'If the account exists, a reset link was sent.' };
}

export async function resetPassword({ token, password }) {
  const user = await userRepo.findUserByResetToken(hashToken(token));
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }
  const passwordHash = await hashPassword(password);
  await userRepo.updateUser(user.id, {
    passwordHash,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  await refreshTokenRepo.revokeAllUserRefreshTokens(user.id);
  return { success: true };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userRepo.findUserByIdWithRole(userId);
  if (!user) throw new AppError('User not found', 404);
  const ok = await comparePassword(currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400);
  const passwordHash = await hashPassword(newPassword);
  await userRepo.updateUser(userId, { passwordHash });
  await refreshTokenRepo.revokeAllUserRefreshTokens(userId);
  return { success: true };
}

export async function getMe(userId) {
  const user = await userRepo.findUserByIdWithRole(userId);
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
}

export async function updateProfile(userId, { firstName, lastName, phone, name }) {
  const user = await userRepo.findUserByIdWithRole(userId);
  if (!user) throw new AppError('User not found', 404);

  let nextFirst = firstName;
  let nextLast = lastName;
  if (name && firstName === undefined && lastName === undefined) {
    const parts = String(name).trim().split(/\s+/);
    nextFirst = parts[0] || user.firstName;
    nextLast = parts.slice(1).join(' ') || user.lastName;
  }

  await userRepo.updateUser(userId, {
    ...(nextFirst !== undefined && { firstName: String(nextFirst).trim() }),
    ...(nextLast !== undefined && { lastName: String(nextLast).trim() }),
    ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
  });

  return getMe(userId);
}

export default {
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  sanitizeUser,
  mapUserPermissions,
};
