const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_docai_jwt_key_2026_academic_workflow';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid format'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      ...decoded,
      _id: decoded.id
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or token is invalid. Please log in again.'
    });
  }
}

module.exports = authenticate;
