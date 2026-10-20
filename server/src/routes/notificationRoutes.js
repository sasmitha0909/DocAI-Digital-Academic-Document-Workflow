const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, notificationController.getMyNotifications);
router.patch('/:id/read', authenticate, notificationController.markNotificationRead);
router.patch('/read-all', authenticate, notificationController.markAllNotificationsRead);

module.exports = router;
