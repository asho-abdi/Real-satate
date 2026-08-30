import { body, param } from 'express-validator';

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export const updateRolePermissionsValidators = [
  param('id').isUUID().withMessage('Valid id is required'),
  body('permissionIds')
    .optional()
    .isArray()
    .withMessage('permissionIds must be an array'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('permissions must be an array'),
  body().custom((value) => {
    if (!Array.isArray(value.permissionIds) && !Array.isArray(value.permissions)) {
      throw new Error('permissionIds or permissions array is required');
    }
    return true;
  }),
];

export default { idParamValidators, updateRolePermissionsValidators };
