const Notification = require('../models/Notification');

async function createNotification({ recipient, title, message, type = 'INFO', link = '' }) {
  return Notification.create({
    recipient,
    title,
    message,
    type,
    link
  });
}

async function getUserNotifications(userId) {
  return Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(50);
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, isRead: false });
}

async function markAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );
}

async function markAllAsRead(userId) {
  return Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
