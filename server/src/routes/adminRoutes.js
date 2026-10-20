const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Admin and Principal access
router.get('/analytics', authenticate, requireRole('admin', 'principal'), adminController.getAnalytics);
router.get('/delayed', authenticate, requireRole('admin', 'principal'), adminController.getDelayed);
router.get('/search', authenticate, requireRole('admin', 'principal'), adminController.searchApps);
router.get('/audit-logs', authenticate, requireRole('admin', 'principal'), adminController.getLogs);

module.exports = router;
