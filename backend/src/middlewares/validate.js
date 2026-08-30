import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

/**
 * Run express-validator validationResult and throw 422 on failure.
 * @type {import('express').RequestHandler}
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array({ onlyFirstError: false }).map((e) => ({
    field: e.type === 'field' ? e.path : e.param || e.type,
    message: e.msg,
    value: e.value,
  }));

  return next(
    new AppError('Validation failed', 422, {
      code: 'VALIDATION_ERROR',
      details: errors,
    }),
  );
}

export default validate;
