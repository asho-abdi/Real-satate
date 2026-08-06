import { v4 as uuidv4 } from 'uuid';

/**
 * Attach a unique requestId to each request (and echo it on the response).
 * @type {import('express').RequestHandler}
 */
export function requestContext(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.trim() ? incoming.trim() : uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export default requestContext;
