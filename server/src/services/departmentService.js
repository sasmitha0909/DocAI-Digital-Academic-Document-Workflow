const Department = require('../models/Department');

async function getAllDepartments() {
  return Department.find().sort({ name: 1 });
}

module.exports = {
  getAllDepartments
};
