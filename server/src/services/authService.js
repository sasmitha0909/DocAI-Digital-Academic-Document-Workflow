const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_docai_jwt_key_2026_academic_workflow';
const JWT_EXPIRES_IN = '24h';

/**
 * Authenticate user by email or register number and password
 */
async function loginUser({ identifier, password }) {
  if (!identifier || !password) {
    const error = new Error('Email/Register number and password are required');
    error.statusCode = 400;
    throw error;
  }

  const cleanIdentifier = identifier.trim();

  // Faculty, HOD, Admin and Principal log in with email only. Students can use email or register number.
  let query;
  if (cleanIdentifier.includes('@')) {
    query = { email: cleanIdentifier.toLowerCase() };
  } else {
    // Only students are allowed to log in via register number
    query = { registerNumber: cleanIdentifier.toUpperCase(), role: 'student' };
  }

  const user = await User.findOne(query).populate('department');

  if (!user) {
    const error = new Error('Invalid email/register number or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account is inactive. Please contact the administrator.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email/register number or password');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token
  const tokenPayload = {
    id: user._id,
    role: user.role,
    email: user.email,
    name: user.name,
    registerNumber: user.registerNumber,
    department: user.department ? user.department._id : null,
    departmentCode: user.department ? user.department.code : null,
    departmentName: user.department ? user.department.name : null
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      registerNumber: user.registerNumber,
      role: user.role,
      designation: user.designation,
      year: user.year,
      department: user.department,
      signatureImage: user.signatureImage
    }
  };
}

/**
 * Register a new user account (Student, Faculty, HOD, Admin, Principal)
 */
async function registerUser({ name, email, registerNumber, password, role, department, designation, year }) {
  if (!name || !name.trim()) {
    const error = new Error('Full Name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!email || !email.trim()) {
    const error = new Error('Email address is required');
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 4) {
    const error = new Error('Password must be at least 4 characters long');
    error.statusCode = 400;
    throw error;
  }

  const cleanRole = (role || 'student').toLowerCase();
  const validRoles = ['student', 'faculty', 'hod', 'admin', 'principal'];
  if (!validRoles.includes(cleanRole)) {
    const error = new Error(`Invalid role '${cleanRole}'. Must be one of: student, faculty, hod, admin, principal.`);
    error.statusCode = 400;
    throw error;
  }

  // Check if email already exists
  const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingEmail) {
    const error = new Error(`An account with email '${email.trim().toLowerCase()}' already exists. Please sign in.`);
    error.statusCode = 409;
    throw error;
  }

  // Validate student register number
  let cleanRegNo = null;
  if (cleanRole === 'student') {
    if (!registerNumber || !registerNumber.trim()) {
      const error = new Error('Register number is required for students');
      error.statusCode = 400;
      throw error;
    }
    cleanRegNo = registerNumber.trim().toUpperCase();
    const existingReg = await User.findOne({ registerNumber: cleanRegNo });
    if (existingReg) {
      const error = new Error(`An account with register number '${cleanRegNo}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
  }

  // Resolve or create department
  let deptId = null;
  if (department && department.toString().trim()) {
    const deptStr = department.toString().trim();
    if (mongoose.Types.ObjectId.isValid(deptStr)) {
      const foundById = await Department.findById(deptStr);
      if (foundById) deptId = foundById._id;
    }

    if (!deptId) {
      // Find by code or name
      let foundDept = await Department.findOne({
        $or: [
          { code: deptStr.toUpperCase() },
          { name: new RegExp('^' + deptStr + '$', 'i') }
        ]
      });

      // If not found and a custom department name was entered, auto-create it!
      if (!foundDept && deptStr.length >= 2) {
        const generatedCode = deptStr
          .split(' ')
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 5) || deptStr.slice(0, 4).toUpperCase();

        try {
          foundDept = await Department.create({
            name: deptStr,
            code: generatedCode,
            description: `${deptStr} Department`
          });
        } catch {
          // If code collision, try random suffix
          const fallbackCode = `${generatedCode}${Math.floor(Math.random() * 90 + 10)}`;
          foundDept = await Department.create({
            name: deptStr,
            code: fallbackCode,
            description: `${deptStr} Department`
          });
        }
      }

      if (foundDept) {
        deptId = foundDept._id;
      }
    }
  }

  // Default designation based on role
  let cleanDesignation = designation ? designation.trim() : '';
  if (!cleanDesignation) {
    if (cleanRole === 'hod') cleanDesignation = 'Head of Department';
    else if (cleanRole === 'faculty') cleanDesignation = 'Assistant Professor';
    else if (cleanRole === 'principal') cleanDesignation = 'Principal & Dean';
    else if (cleanRole === 'admin') cleanDesignation = 'Academic Administrator';
  }

  // Create new user (User pre-save hook will hash password with bcrypt)
  const newUser = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    registerNumber: cleanRegNo,
    role: cleanRole,
    department: deptId,
    designation: cleanDesignation,
    year: cleanRole === 'student' ? (year ? Number(year) : 3) : null,
    isActive: true
  });

  const populatedUser = await User.findById(newUser._id).populate('department');

  // Generate JWT token
  const tokenPayload = {
    id: populatedUser._id,
    role: populatedUser.role,
    email: populatedUser.email,
    name: populatedUser.name,
    registerNumber: populatedUser.registerNumber,
    department: populatedUser.department ? populatedUser.department._id : null,
    departmentCode: populatedUser.department ? populatedUser.department.code : null,
    departmentName: populatedUser.department ? populatedUser.department.name : null
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  let redirectPath = '/student';
  if (populatedUser.role === 'faculty') redirectPath = '/faculty';
  else if (populatedUser.role === 'hod') redirectPath = '/hod';
  else if (populatedUser.role === 'admin') redirectPath = '/admin';
  else if (populatedUser.role === 'principal') redirectPath = '/principal';

  return {
    token,
    user: {
      id: populatedUser._id,
      name: populatedUser.name,
      email: populatedUser.email,
      registerNumber: populatedUser.registerNumber,
      role: populatedUser.role,
      designation: populatedUser.designation,
      year: populatedUser.year,
      department: populatedUser.department,
      signatureImage: populatedUser.signatureImage
    },
    redirectPath
  };
}

/**
 * Get profile for authenticated user
 */
async function getUserProfile(userId) {
  const user = await User.findById(userId).populate('department');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    registerNumber: user.registerNumber,
    role: user.role,
    designation: user.designation,
    year: user.year,
    department: user.department,
    signatureImage: user.signatureImage,
    createdAt: user.createdAt
  };
}

module.exports = {
  loginUser,
  registerUser,
  getUserProfile
};
