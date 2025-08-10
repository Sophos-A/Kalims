/**
 * Visit Routes
 * Handles API routes for visit-related operations
 */

const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');

// Authentication is already applied in server.js
// No need to import or apply middleware here

// Get all visits
router.get('/', visitController.getAllVisits);

// Get active visits (not completed)
router.get('/active', visitController.getActiveVisits);

// Get visits by date range
router.get('/date-range', visitController.getVisitsByDateRange);

// Get visits by patient ID
router.get('/patient/:patientId', visitController.getVisitsByPatientId);

// Get visit by ID
router.get('/:id', visitController.getVisitById);

// Create a new visit
router.post('/', visitController.createVisit);

// Update a visit
router.put('/:id', visitController.updateVisit);

// Complete a visit
router.put('/:id/complete', visitController.completeVisit);

module.exports = router;