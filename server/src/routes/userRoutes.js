const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Admin and Principal can list all users
router.get('/', authenticate, requireRole('admin', 'principal'), userController.getUsers);

// Any authenticated user can view faculty list (needed when applying for recommendations)
router.get('/faculty', authenticate, userController.getFacultyList);

// Role-protected test probes (Used to verify 403 Forbidden enforcement on each role)
router.get('/probe/faculty', authenticate, requireRole('faculty'), userController.facultyProbe);
router.get('/probe/hod', authenticate, requireRole('hod'), userController.hodProbe);
router.get('/probe/admin', authenticate, requireRole('admin'), userController.adminProbe);
router.get('/probe/principal', authenticate, requireRole('principal'), userController.principalProbe);

module.exports = router;
