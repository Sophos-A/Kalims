const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * @route   GET /api/patients
 * @desc    Get all patients
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, name, dob, gender, phone, email, address, 
        medicalHistory, createdat 
      FROM patients 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /patients error:', err);
    res.status(500).json({
      error: 'Failed to fetch patients',
      details: err.message
    });
  }
});

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT 
        id, name, dob, gender, phone, email, address, 
        medicalHistory, createdat 
      FROM patients 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /patients/:id error:', err);
    res.status(500).json({
      error: 'Database error',
      details: err.message
    });
  }
});

/**
 * @route   POST /api/patients
 * @desc    Register a new patient
 * @body    { name, dob, gender, phone, email, address, medicalHistory }
 * @access  Private
 */
router.post('/', async (req, res) => {
  const {
    name, dob, gender, phone, email, address, medicalHistory
  } = req.body;

  // Validation
  if (!name || !dob) {
    return res.status(400).json({
      error: 'Name and date of birth are required'
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO patients 
         (name, dob, gender, phone, email, address, medicalHistory) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, dob, gender, phone, email, address, createdat`,
      [name, dob, gender, phone, email, address, medicalHistory]
    );

    const patient = result.rows[0];

    // Auto-create visit
    const visit = await db.query(
      `INSERT INTO visits (patientId, checkInTime, status) 
       VALUES ($1, NOW(), 'registered') RETURNING id`,
      [patient.id]
    );

    // Add to queue with default priority
    await db.query(
      `INSERT INTO queue_positions (patientId, visitId, priorityScore, status) 
       VALUES ($1, $2, 0.0, 'waiting')`,
      [patient.id, visit.rows[0].id]
    );

    // Return patient data with visitId for triage
    res.status(201).json({
      ...patient,
      visitId: visit.rows[0].id
    });
  } catch (err) {
    console.error('POST /patients error:', err);
    res.status(500).json({
      error: 'Failed to register patient',
      details: err.message
    });
  }
});

/**
 * @route   PUT /api/patients/:id
 * @desc    Update patient info
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = ['name', 'dob', 'gender', 'phone', 'email', 'address', 'medicalHistory'];
  const values = fields.map(f => req.body[f]).filter(v => v !== undefined);
  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  if (values.length === 0) {
    return res.status(400).json({
      error: 'No fields to update'
    });
  }

  try {
    const result = await db.query(
      `UPDATE patients SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /patients/:id error:', err);
    res.status(500).json({
      error: 'Update failed',
      details: err.message
    });
  }
});

module.exports = router;