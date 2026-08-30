/**
 * Wrap an async Express route/middleware so rejected promises reach next().
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown> | unknown} fn
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
