import * as mfaService from '../services/mfa.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';

export const status = asyncHandler(async (req, res) => {
  const data = await mfaService.getMfaStatus(req.user);
  return success(res, data);
});

export const begin = asyncHandler(async (req, res) => {
  const data = await mfaService.beginEnrollment(req.user);
  return success(res, data);
});

export const confirm = asyncHandler(async (req, res) => {
  const data = await mfaService.confirmEnrollment(req.user, req.body?.code);
  return success(res, data);
});

export const disable = asyncHandler(async (req, res) => {
  const data = await mfaService.disableMfa(req.user, {
    code: req.body?.code,
    recoveryCode: req.body?.recoveryCode,
  });
  return success(res, data);
});
