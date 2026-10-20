const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Reviewer queues (Faculty, HOD, Principal, Admin)
router.get('/queue', authenticate, requireRole('faculty', 'hod', 'principal', 'admin'), workflowController.getQueue);

// Approval actions
router.post('/:id/approve', authenticate, requireRole('faculty', 'hod', 'principal', 'admin'), workflowController.approve);
router.post('/:id/reject', authenticate, requireRole('faculty', 'hod', 'principal', 'admin'), workflowController.reject);
router.post('/:id/correction', authenticate, requireRole('faculty', 'hod', 'principal', 'admin'), workflowController.requestCorrection);
router.post('/:id/request-correction', authenticate, requireRole('faculty', 'hod', 'principal', 'admin'), workflowController.requestCorrection);

// Student resubmission
router.post('/:id/resubmit', authenticate, requireRole('student'), workflowController.resubmit);

module.exports = router;
