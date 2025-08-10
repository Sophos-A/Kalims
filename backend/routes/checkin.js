const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');

/**
 * @route   POST /api/checkin/patient-login
 * @desc    Patient login check-in - creates visit and adds to vitals queue
 * @access  Public
 */
router.post('/patient-login', checkinController.patientLoginCheckin);

// QR code routes have been removed - patients now use email/password login

module.exports = router;