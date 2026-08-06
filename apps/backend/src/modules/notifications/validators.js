import { param } from 'express-validator';

export const idParamValidators = [param('id').isUUID().withMessage('Valid id is required')];

export default { idParamValidators };
