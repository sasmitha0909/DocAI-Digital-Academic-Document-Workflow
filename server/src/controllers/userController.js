const userService = require('../services/userService');

async function getUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers(req.query);
    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (err) {
    next(err);
  }
}

async function getFacultyList(req, res, next) {
  try {
    const faculty = await userService.getFacultyMembers(req.query.departmentId);
    return res.status(200).json({
      success: true,
      count: faculty.length,
      faculty
    });
  } catch (err) {
    next(err);
  }
}

// Role-protected test probes
function facultyProbe(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Faculty route accessed successfully',
    caller: req.user
  });
}

function adminProbe(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Admin route accessed successfully',
    caller: req.user
  });
}

function hodProbe(req, res) {
  return res.status(200).json({
    success: true,
    message: 'HOD route accessed successfully',
    caller: req.user
  });
}

function principalProbe(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Principal route accessed successfully',
    caller: req.user
  });
}

module.exports = {
  getUsers,
  getFacultyList,
  facultyProbe,
  adminProbe,
  hodProbe,
  principalProbe
};
