const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(notificationController.getNotifications);

router.route('/read-all')
  .post(notificationController.markAllRead);

router.route('/:id/read')
  .patch(notificationController.markAsRead);

module.exports = router;
