import crypto from 'node:crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { isAdminUser } from './access.service.js';
import { encryptSecret, decryptSecret, hashRecoveryCode } from '../utils/secretBox.js';
import { logActivity } from './activity.service.js';
import env from '../config/env.js';

const RECOVERY_COUNT = 8;

function issuer() {
  return env.APP_NAME || 'RJK Realty';
}

/**
 * Begin MFA enrollment — returns otpauth URI + plaintext recovery codes once.
 * Secret is stored encrypted but not enabled until verified.
 */
export async function beginEnrollment(user) {
  if (!isAdminUser(user)) {
    throw new AppError('MFA enrollment is limited to administrators', 403, { code: 'MFA_ADMIN_ONLY' });
  }

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) throw new AppError('User not found', 404);
  if (full.mfaEnabled) {
    throw new AppError('MFA is already enabled. Disable it before re-enrolling.', 400, {
      code: 'MFA_ALREADY_ENABLED',
    });
  }

  const secret = generateSecret();
  const recoveryPlain = Array.from({ length: RECOVERY_COUNT }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  );
  const recoveryHashes = recoveryPlain.map(hashRecoveryCode);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaSecretEnc: encryptSecret(secret),
      mfaRecoveryHashes: recoveryHashes,
      mfaEnabled: false,
      mfaEnrolledAt: null,
    },
  });

  const uri = generateURI({
    issuer: issuer(),
    label: full.email,
    secret,
  });

  await logActivity({
    entityType: 'AUTH',
    entityId: user.id,
    action: 'MFA_ENROLL_STARTED',
    summary: 'Administrator started MFA enrollment',
    actorId: user.id,
  });

  return {
    otpauthUrl: uri,
    secret,
    recoveryCodes: recoveryPlain,
    message: 'Scan the QR / enter the secret in your authenticator, then confirm with a code.',
  };
}

export async function confirmEnrollment(user, code) {
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full?.mfaSecretEnc) {
    throw new AppError('Start MFA enrollment first', 400, { code: 'MFA_NOT_STARTED' });
  }
  if (full.mfaEnabled) {
    return { mfaEnabled: true };
  }

  const secret = decryptSecret(full.mfaSecretEnc);
  const result = verifySync({ token: String(code || ''), secret });
  if (!result.valid) {
    throw new AppError('Invalid authenticator code', 400, { code: 'MFA_INVALID_CODE' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: true,
      mfaEnrolledAt: new Date(),
    },
  });

  await logActivity({
    entityType: 'AUTH',
    entityId: user.id,
    action: 'MFA_ENABLED',
    summary: 'Administrator enabled MFA',
    actorId: user.id,
  });

  return { mfaEnabled: true };
}

export async function disableMfa(user, { code, recoveryCode } = {}) {
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) throw new AppError('User not found', 404);
  if (!full.mfaEnabled) return { mfaEnabled: false };

  const ok = await verifyUserMfa(full, { code, recoveryCode });
  if (!ok) {
    throw new AppError('Invalid MFA or recovery code', 400, { code: 'MFA_INVALID_CODE' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaSecretEnc: null,
      mfaRecoveryHashes: null,
      mfaEnrolledAt: null,
    },
  });

  await logActivity({
    entityType: 'AUTH',
    entityId: user.id,
    action: 'MFA_DISABLED',
    summary: 'Administrator disabled MFA',
    actorId: user.id,
  });

  return { mfaEnabled: false };
}

export async function getMfaStatus(user) {
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true, mfaEnrolledAt: true, role: true, roleRef: true },
  });
  return {
    available: isAdminUser(user),
    mfaEnabled: Boolean(full?.mfaEnabled),
    mfaEnrolledAt: full?.mfaEnrolledAt || null,
  };
}

/**
 * Verify TOTP or single-use recovery code. Consumes recovery code on success.
 * @returns {Promise<boolean>}
 */
export async function verifyUserMfa(userRow, { code, recoveryCode } = {}) {
  if (!userRow?.mfaEnabled || !userRow.mfaSecretEnc) return true;

  if (code) {
    const secret = decryptSecret(userRow.mfaSecretEnc);
    const result = verifySync({ token: String(code), secret });
    if (result.valid) return true;
  }

  if (recoveryCode && Array.isArray(userRow.mfaRecoveryHashes)) {
    const hash = hashRecoveryCode(recoveryCode);
    const idx = userRow.mfaRecoveryHashes.indexOf(hash);
    if (idx >= 0) {
      const next = [...userRow.mfaRecoveryHashes];
      next.splice(idx, 1);
      await prisma.user.update({
        where: { id: userRow.id },
        data: { mfaRecoveryHashes: next },
      });
      await logActivity({
        entityType: 'AUTH',
        entityId: userRow.id,
        action: 'MFA_RECOVERY_USED',
        summary: 'MFA recovery code used',
        actorId: userRow.id,
      });
      return true;
    }
  }

  return false;
}
