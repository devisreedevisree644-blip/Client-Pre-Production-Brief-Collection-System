const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Project Manager'), clientController.getClients)
  .post(authorize('Admin'), clientController.createClient);

router.route('/:id')
  .get(authorize('Admin', 'Project Manager'), clientController.getClientById)
  .put(authorize('Admin'), clientController.updateClient)
  .delete(authorize('Admin'), clientController.deleteClient);

module.exports = router;
