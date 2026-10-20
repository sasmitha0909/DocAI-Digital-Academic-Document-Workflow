/**
 * Role-based authorization middleware.
 * Accepts one or multiple allowed roles.
 * Returns 403 Forbidden if user's role is not authorized.
 */
function requireRole(...allowedRoles) {
  // Support both requireRole('admin', 'principal') and requireRole(['admin', 'principal'])
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: user with role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
}

module.exports = requireRole;
