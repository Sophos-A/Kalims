/**
 * Patient Authentication Controller
 * Handles patient login and registration
 */
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Patient login
 * @param {Object} req - Request object with email/hospitalId and password
 * @param {Object} res - Response object
 */
exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  // Validate required fields
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Hospital ID and password are required' });
  }

  try {
    // Check if identifier is email or hospital ID
    const patientResult = await db.query(
      `SELECT id, name, hospital_id, password_hash 
       FROM patients 
       WHERE email = $1 OR hospital_id = $1`,
      [identifier]
    );

    if (patientResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
    }

    const patient = patientResult.rows[0];
    
    // Verify password if password_hash exists
    let isPasswordValid = false;
    
    if (patient.password_hash) {
      // Compare with bcrypt
      isPasswordValid = await bcrypt.compare(password, patient.password_hash);
    } else {
      // For backward compatibility or demo purposes
      isPasswordValid = true;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: patient.id, name: patient.name, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        patient: {
          id: patient.id,
          name: patient.name
        }
      }
    });

  } catch (error) {
    console.error('Error during patient login:', error);
    return res.status(500).json({ 
      error: 'Login failed', 
      details: error.message 
    });
  }
};

/**
 * Patient registration
 * @param {Object} req - Request object with patient details
 * @param {Object} res - Response object
 */
exports.register = async (req, res) => {
  const { 
    name, 
    dateOfBirth, 
    gender, 
    address, 
    contactNumber, 
    email, 
    emergencyContact, 
    medicalHistory,
    password // We'll accept this parameter but won't store it in the database
  } = req.body;

  // Validate required fields
  if (!name || !dateOfBirth || !gender || !address || !contactNumber || !email || !emergencyContact || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if email already exists
    const existingPatient = await db.query(
      'SELECT id FROM patients WHERE email = $1',
      [email]
    );

    if (existingPatient.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate unique hospital ID
    const hospitalId = generateHospitalId();

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new patient
    const result = await db.query(
      `INSERT INTO patients 
        (name, dob, gender, address, phone, email, medicalhistory, emergency_contact, hospital_id, password_hash, createdat, updatedat) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
        RETURNING id, name, hospital_id`,
      [
        name,
        dateOfBirth,
        gender,
        address,
        contactNumber,
        email,
        medicalHistory || '',
        emergencyContact,
        hospitalId,
        hashedPassword
      ]
    );

    const patient = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: patient.id, name: patient.name, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Add patient to vitals queue
    await addToVitalsQueue(patient.id);

    // Get queue position and estimated wait time
    const queueInfo = await getQueueInfo(patient.id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        patient: {
            id: patient.id,
            name: patient.name,
            hospitalId: patient.hospital_id
          },
        queue: {
          position: queueInfo.position,
          estimatedWaitTime: queueInfo.estimatedWaitTime
        }
      }
    });

  } catch (error) {
    console.error('Error during patient registration:', error);
    return res.status(500).json({ 
      error: 'Registration failed', 
      details: error.message 
    });
  }
};

/**
 * Generate unique hospital ID
 * @returns {String} - Unique hospital ID
 */
function generateHospitalId() {
  // Generate a random 8-character alphanumeric ID
  return 'PT' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Add patient to vitals queue
 * @param {Number} patientId - Patient ID
 */
async function addToVitalsQueue(patientId) {
  try {
    // Create a new visit record
    const visitResult = await db.query(
      `INSERT INTO visits (patientId, checkInTime, status, check_in_method) 
       VALUES ($1, NOW(), 'registered', 'web') 
       RETURNING id`,
      [patientId]
    );

    const visitId = visitResult.rows[0].id;

    // Add to queue_positions table with queue_type = 'vitals'
    await db.query(
      `INSERT INTO queue_positions (visitId, status, queue_type, createdAt, estimated_wait_time) 
       VALUES ($1, 'waiting', 'vitals', NOW(), 15)`,
      [visitId]
    );

  } catch (error) {
    console.error('Error adding patient to vitals queue:', error);
    throw error;
  }
}

/**
 * Get queue position and estimated wait time for a patient
 * @param {Number} patientId - Patient ID
 * @returns {Object} - Queue position and estimated wait time
 */
async function getQueueInfo(patientId) {
  try {
    // Get the latest visit for this patient
    const visitResult = await db.query(
      `SELECT id FROM visits 
       WHERE patientId = $1 AND status = 'registered' 
       ORDER BY checkInTime DESC LIMIT 1`,
      [patientId]
    );

    if (visitResult.rows.length === 0) {
      return { position: 0, estimatedWaitTime: 0 };
    }

    const visitId = visitResult.rows[0].id;

    // Get queue position
    const queueResult = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM queue_positions 
          WHERE queue_type = 'vitals' AND status = 'waiting' 
          AND createdAt <= (SELECT createdAt FROM queue_positions WHERE visitId = $1)) 
         as position, 
         estimated_wait_time 
       FROM queue_positions 
       WHERE visitId = $1`,
      [visitId]
    );

    if (queueResult.rows.length === 0) {
      return { position: 0, estimatedWaitTime: 0 };
    }

    return {
      position: parseInt(queueResult.rows[0].position),
      estimatedWaitTime: parseInt(queueResult.rows[0].estimated_wait_time)
    };

  } catch (error) {
    console.error('Error getting queue info:', error);
    return { position: 0, estimatedWaitTime: 0 };
  }
}