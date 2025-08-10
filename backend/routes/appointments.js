const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Get all appointments
router.get('/', appointmentController.getAppointments);

// Get appointments by patient ID
router.get('/patient/:patientId', appointmentController.getAppointmentsByPatientId);

// Get appointments by doctor ID
router.get('/doctor/:doctorId', appointmentController.getAppointmentsByDoctorId);

// Create a new appointment
router.post('/', appointmentController.createAppointment);

// Update appointment status
router.put('/:id/status', appointmentController.updateAppointmentStatus);

// Cancel appointment
router.put('/:id/cancel', appointmentController.cancelAppointment);

// Reschedule appointment
router.put('/:id/reschedule', appointmentController.rescheduleAppointment);

module.exports = router;
