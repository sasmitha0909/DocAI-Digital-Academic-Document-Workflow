const express = require('express');
const router = express.Router();
const documentTypeController = require('../controllers/documentTypeController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, documentTypeController.getDocumentTypes);
router.get('/:code', authenticate, documentTypeController.getDocumentTypeByCode);

module.exports = router;
