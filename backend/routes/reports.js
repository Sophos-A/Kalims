const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

// Get daily attendance report
router.get('/daily', authMiddleware(), reportController.getDailyAttendanceReport);

// Get date range report
router.get('/range', authMiddleware(), reportController.getDateRangeReport);

// Export data as CSV
router.get('/export', authMiddleware(), reportController.exportDataCSV);

module.exports = router;