export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function sendError(res, err, status = 500) {
  res.status(status).json({ ok: false, error: err?.message || String(err || 'Error interno') });
}
