const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

// Get all notifications for a user
router.get('/', authMiddleware(), notificationController.getNotifications);

// Mark notification as read
router.put('/:notificationId/read', authMiddleware(), notificationController.markAsRead);

module.exports = router;