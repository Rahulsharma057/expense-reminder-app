// Catches anything thrown/rejected inside async route handlers wrapped
// with asyncHandler, and any errors passed to next(err).
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Something went wrong on the server." });
};

module.exports = { asyncHandler, notFound, errorHandler };
