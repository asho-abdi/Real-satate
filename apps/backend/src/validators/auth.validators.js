import { body } from 'express-validator';

export const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const logoutValidators = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

export const refreshValidators = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

export const forgotPasswordValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidators = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

export default {
  loginValidators,
  logoutValidators,
  refreshValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
};
