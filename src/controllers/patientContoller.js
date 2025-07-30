// src/controllers/patientController.js

const Patient = require('../models/Patient');

// Get all patients
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.findAll();
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Check in a patient
exports.checkIn = async (req, res) => {
  try {
    const { name, age, visit_type, is_wheelchair } = req.body;

    const newPatient = await Patient.create({
      name,
      age,
      visit_type,
      is_wheelchair,
      check_in_time: new Date(),
      status: 'waiting',
    });

    res.status(201).json(newPatient);
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get position in queue (to be implemented later)
exports.getQueuePosition = async (req, res) => {
  const visitId = req.params.visitId;
  res.send(`Position for visit ID ${visitId} will be handled here.`);
};
