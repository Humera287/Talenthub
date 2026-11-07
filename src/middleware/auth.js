const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../services/errors');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError(401, 'Login required'));
  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

// Authorization is always decided on the server, never by the client (FR-1.1).
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError(403, 'You do not have permission for this action'));

module.exports = { authenticate, requireRole };
