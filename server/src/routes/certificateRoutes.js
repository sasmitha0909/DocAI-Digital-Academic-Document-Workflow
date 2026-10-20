const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');

// Student issued certificates
router.get('/my-certificates', authenticate, requireRole('student'), certificateController.getMyCertificates);

// Admin & Principal all certificates view
router.get('/', authenticate, requireRole('admin', 'principal'), certificateController.getAllCertificates);

// Secure download and preview
router.get('/:id/download', authenticate, certificateController.downloadCertificate);
router.get('/:id/preview', authenticate, certificateController.previewCertificate);

// Admin revocation
router.post('/:id/revoke', authenticate, requireRole('admin'), certificateController.revoke);

module.exports = router;
