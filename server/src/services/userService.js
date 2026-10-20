const User = require('../models/User');

async function getAllUsers(filter = {}) {
  const query = {};
  if (filter.role) query.role = filter.role;
  if (filter.department) query.department = filter.department;

  return User.find(query)
    .select('-password')
    .populate('department', 'name code')
    .sort({ createdAt: -1 });
}

async function getFacultyMembers(departmentId = null) {
  const query = { role: { $in: ['faculty', 'hod'] } };
  if (departmentId) query.department = departmentId;

  return User.find(query)
    .select('name email role designation department')
    .populate('department', 'name code')
    .sort({ name: 1 });
}

module.exports = {
  getAllUsers,
  getFacultyMembers
};
