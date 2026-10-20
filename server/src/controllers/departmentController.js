const departmentService = require('../services/departmentService');

async function getDepartments(req, res, next) {
  try {
    const departments = await departmentService.getAllDepartments();
    return res.status(200).json({
      success: true,
      departments
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDepartments
};
