/**
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {number} [status=200]
 * @param {Record<string, unknown> | null} [meta=null]
 */
export function success(res, data, status = 200, meta = null) {
  const body = { success: true, data };
  if (meta != null) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [status=400]
 * @param {unknown} [details=null]
 */
export function fail(res, message, status = 400, details = null) {
  const error = { message };
  if (details != null) error.details = details;
  return res.status(status).json({ success: false, error });
}

/**
 * @param {import('express').Response} res
 * @param {string} [message='Resource not found']
 */
export function notFound(res, message = 'Resource not found') {
  return fail(res, message, 404);
}

/**
 * @param {import('express').Response} res
 * @param {string} [message='Unauthorized']
 */
export function unauthorized(res, message = 'Unauthorized') {
  return fail(res, message, 401);
}

/**
 * @param {import('express').Response} res
 * @param {string} [message='Forbidden']
 */
export function forbidden(res, message = 'Forbidden') {
  return fail(res, message, 403);
}

export default { success, fail, notFound, unauthorized, forbidden };
