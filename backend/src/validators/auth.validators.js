import { body } from 'express-validator';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

function strongPassword(field = 'password') {
  return body(field).custom((value) => {
    const result = validatePasswordStrength(value);
    if (!result.ok) throw new Error(result.message);
    return true;
  });
}

export const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('mfaCode').optional({ nullable: true }).isString(),
  body('recoveryCode').optional({ nullable: true }).isString(),
];

// refreshToken may arrive via HttpOnly cookie during dual-mode auth migration
export const logoutValidators = [
  body('refreshToken').optional({ nullable: true }).isString(),
];

export const refreshValidators = [
  body('refreshToken').optional({ nullable: true }).isString(),
];

export const forgotPasswordValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  strongPassword('password'),
];

export const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  strongPassword('newPassword'),
];

export default {
  loginValidators,
  logoutValidators,
  refreshValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
};
