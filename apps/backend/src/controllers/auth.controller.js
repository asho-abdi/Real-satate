import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';

function clientMeta(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password }, clientMeta(req));
  return success(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;
  const result = await authService.logout(refreshToken, clientMeta(req));
  return success(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;
  const result = await authService.refreshTokens(refreshToken, clientMeta(req));
  return success(res, result);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email, clientMeta(req));
  return success(res, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword({ token, password }, clientMeta(req));
  return success(res, result);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(
    req.user.id,
    { currentPassword, newPassword },
    clientMeta(req),
  );
  return success(res, result);
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return success(res, { user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body || {});
  return success(res, { user });
});

export default {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
  updateProfile,
};
