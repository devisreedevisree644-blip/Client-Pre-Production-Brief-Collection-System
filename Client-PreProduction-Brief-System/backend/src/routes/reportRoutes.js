const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('Admin', 'Project Manager'));

router.get('/summary', reportController.getReportSummary);
router.get('/trends', reportController.getReportTrends);
router.get('/export', reportController.exportReportCSV);

module.exports = router;
