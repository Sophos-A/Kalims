/**
 * AI Triage Routes
 * Handles routes for AI-powered triage and queue management
 */
const express = require('express');
const router = express.Router();
const aiTriageController = require('../controllers/aiTriageController');
const authenticateToken = require('../middleware/auth');

// Process vitals data and generate triage score
router.post('/process', authenticateToken(), aiTriageController.processTriage);

// Get vitals queue - accessible by staff and patients
router.get('/vitals-queue', authenticateToken(true), aiTriageController.getVitalsQueue);

// Get doctor queue - accessible by staff and patients
router.get('/doctor-queue', authenticateToken(true), aiTriageController.getDoctorQueue);

module.exports = router;