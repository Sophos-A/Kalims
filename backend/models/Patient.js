/**
 * Patient model for database operations
 */
const db = require('../config/db');

/**
 * Get all patients
 * @returns {Promise<Array>} Array of patient objects
 */
exports.getAllPatients = async () => {
  try {
    const result = await db.query(
      `SELECT p.*, pc.name as category_name 
       FROM patients p
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       ORDER BY p.name ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

/**
 * Get patient by ID
 * @param {number} id - Patient ID
 * @returns {Promise<Object>} Patient object
 */
exports.getPatientById = async (id) => {
  try {
    const result = await db.query(
      `SELECT p.*, pc.name as category_name 
       FROM patients p
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching patient with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new patient
 * @param {Object} patientData - Patient data
 * @returns {Promise<Object>} Created patient
 */
exports.createPatient = async (patientData) => {
  const { name, dob, gender, phone, email, address, category_id, qr_code } = patientData;
  
  try {
    const result = await db.query(
      `INSERT INTO patients (name, dob, gender, phone, email, address, category_id, qr_code, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [name, dob, gender, phone, email, address, category_id, qr_code]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
};

/**
 * Update a patient
 * @param {number} id - Patient ID
 * @param {Object} patientData - Updated patient data
 * @returns {Promise<Object>} Updated patient
 */
exports.updatePatient = async (id, patientData) => {
  const { name, dob, gender, phone, email, address, category_id } = patientData;
  
  try {
    const result = await db.query(
      `UPDATE patients 
       SET name = $1, dob = $2, gender = $3, phone = $4, email = $5, address = $6, category_id = $7, updated_at = NOW() 
       WHERE id = $8 
       RETURNING *`,
      [name, dob, gender, phone, email, address, category_id, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating patient with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a patient
 * @param {number} id - Patient ID
 * @returns {Promise<boolean>} Success status
 */
exports.deletePatient = async (id) => {
  try {
    const result = await db.query(
      'DELETE FROM patients WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error deleting patient with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Generate a unique QR code for a patient
 * @returns {Promise<string>} Generated QR code
 */
exports.generateUniqueQRCode = async () => {
  // Generate a random alphanumeric string
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  // Keep generating until we find a unique one
  let isUnique = false;
  let qrCode;
  
  while (!isUnique) {
    qrCode = generateRandomCode();
    
    // Check if this code already exists
    const result = await db.query(
      'SELECT id FROM patients WHERE qr_code = $1',
      [qrCode]
    );
    
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }
  
  return qrCode;
};