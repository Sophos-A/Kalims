/**
 * Triage model for database operations
 */
const db = require('../config/db');

/**
 * Submit triage information
 * @param {Object} triageData - Triage data
 * @returns {Promise<Object>} Created triage record
 */
exports.submitTriage = async (triageData) => {
  const { visitId, symptoms, urgencyLevel, vitalSigns, notes } = triageData;
  
  try {
    const result = await db.query(
      `INSERT INTO triage_records (visit_id, symptoms, urgency_level, vital_signs, notes, triage_time) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [visitId, symptoms, urgencyLevel, vitalSigns, notes]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error submitting triage:', error);
    throw error;
  }
};

/**
 * Get triage results by visit ID
 * @param {number} visitId - Visit ID
 * @returns {Promise<Object>} Triage record
 */
exports.getTriageByVisitId = async (visitId) => {
  try {
    const result = await db.query(
      `SELECT tr.*, v.patient_id, p.name as patient_name, p.gender, p.dob 
       FROM triage_records tr
       JOIN visits v ON tr.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       WHERE tr.visit_id = $1`,
      [visitId]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching triage for visit ID ${visitId}:`, error);
    throw error;
  }
};

/**
 * Update triage severity score
 * @param {number} triageId - Triage ID
 * @param {number} severityScore - Calculated severity score
 * @param {string} recommendations - AI-generated recommendations
 * @returns {Promise<Object>} Updated triage record
 */
exports.updateTriageSeverity = async (triageId, severityScore, recommendations) => {
  try {
    const result = await db.query(
      `UPDATE triage_records 
       SET severityscore = $1, recommendations = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [severityScore, recommendations, triageId]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating triage severity for ID ${triageId}:`, error);
    throw error;
  }
};

/**
 * Get all triage records
 * @returns {Promise<Array>} Array of triage records
 */
exports.getAllTriageRecords = async () => {
  try {
    const result = await db.query(
      `SELECT tr.*, v.patient_id, p.name as patient_name, p.gender, p.dob 
       FROM triage_records tr
       JOIN visits v ON tr.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       ORDER BY tr.triage_time DESC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching all triage records:', error);
    throw error;
  }
};