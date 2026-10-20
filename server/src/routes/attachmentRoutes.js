const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const authenticate = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Upload endpoint (authenticated users only)
router.post('/upload', authenticate, upload.single('file'), attachmentController.uploadFile);

// Authorized preview and download (access verified per user/role)
router.get('/:id/preview', authenticate, attachmentController.previewAttachment);
router.get('/:id/download', authenticate, attachmentController.downloadAttachment);

module.exports = router;
