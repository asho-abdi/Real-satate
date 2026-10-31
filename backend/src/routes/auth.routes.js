import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import {
  loginValidators,
  logoutValidators,
  refreshValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  changePasswordValidators,
} from '../validators/auth.validators.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', authRateLimiter, loginValidators, validate, authController.login);
router.post('/logout', logoutValidators, validate, authController.logout);
router.post('/refresh', authRateLimiter, refreshValidators, validate, authController.refresh);
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  forgotPasswordValidators,
  validate,
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authRateLimiter,
  resetPasswordValidators,
  validate,
  authController.resetPassword,
);
router.post(
  '/change-password',
  authenticate,
  changePasswordValidators,
  validate,
  authController.changePassword,
);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateProfile);

export default router;
