// src/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/check-in', authenticate, authorize(['staff', 'admin']), patientController.checkIn);
router.get('/:visitId/position', authenticate, patientController.getQueuePosition);
router.get('/', authenticate, authorize(['admin']), patientController.getAllPatients);

module.exports = router;