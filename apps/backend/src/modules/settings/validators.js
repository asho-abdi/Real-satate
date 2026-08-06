import { body, param } from 'express-validator';

export const keyParamValidators = [
  param('key').trim().notEmpty().withMessage('key is required'),
];

export const upsertSettingValidators = [
  param('key').trim().notEmpty().withMessage('key is required'),
  body('value').exists().withMessage('value is required'),
  body('group').optional().isString(),
  body('description').optional({ nullable: true }).isString(),
];

export default { keyParamValidators, upsertSettingValidators };
