const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Student endpoints
router.post('/apply', authenticate, requireRole('student'), applicationController.apply);
router.get('/my-applications', authenticate, requireRole('student'), applicationController.getMyApplications);
router.get('/my-stats', authenticate, requireRole('student'), applicationController.getMyStats);

// Single application details (access control enforced inside service based on ownership/department/admin)
router.get('/:id', authenticate, applicationController.getApplication);

module.exports = router;
