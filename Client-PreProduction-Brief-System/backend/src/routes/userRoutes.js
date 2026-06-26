const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUserRegistration } = require('../validators/userValidator');

// All user management routes require admin privileges
router.use(protect);
router.use(authorize('Admin'));

router.route('/')
  .get(userController.getUsers)
  .post(validateUserRegistration, userController.createUser);

router.get('/audit-logs', userController.getAuditLogs);

router.route('/:id')
  .put(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
