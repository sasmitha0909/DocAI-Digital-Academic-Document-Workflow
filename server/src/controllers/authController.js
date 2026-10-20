const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const result = await authService.loginUser({ identifier, password });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await authService.getUserProfile(req.user.id);
    return res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  register,
  getProfile
};
