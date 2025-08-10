/**
 * Patient Authentication Routes
 * Handles routes for patient login and registration
 */
const express = require('express');
const router = express.Router();
const patientAuthController = require('../controllers/patientAuthController');

// Patient login
router.post('/login', patientAuthController.login);

// Patient registration
router.post('/register', patientAuthController.register);

module.exports = router;