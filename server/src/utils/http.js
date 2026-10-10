export function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
