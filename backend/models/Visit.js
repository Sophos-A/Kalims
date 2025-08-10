/**
 * Visit Model
 * Handles database operations for visits
 */

const db = require('../config/db');

const Visit = {
  /**
   * Get all visits
   * @returns {Promise<Array>} Array of visits
   */
  getAllVisits: async () => {
    try {
      const result = await db.query(
        `SELECT v.*, p.name as patient_name 
         FROM visits v 
         JOIN patients p ON v.patient_id = p.id 
         ORDER BY v.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting all visits:', error);
      throw error;
    }
  },

  /**
   * Get visit by ID
   * @param {number} id - Visit ID
   * @returns {Promise<Object>} Visit object
   */
  getVisitById: async (id) => {
    try {
      const result = await db.query(
        `SELECT v.*, p.name as patient_name, p.dob, p.gender, p.phone, p.email 
         FROM visits v 
         JOIN patients p ON v.patient_id = p.id 
         WHERE v.id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error(`Error getting visit with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get visits by patient ID
   * @param {number} patientId - Patient ID
   * @returns {Promise<Array>} Array of visits
   */
  getVisitsByPatientId: async (patientId) => {
    try {
      const result = await db.query(
        `SELECT * FROM visits WHERE patient_id = $1 ORDER BY created_at DESC`,
        [patientId]
      );
      return result.rows;
    } catch (error) {
      console.error(`Error getting visits for patient ${patientId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new visit
   * @param {Object} visitData - Visit data
   * @param {number} visitData.patient_id - Patient ID
   * @param {string} visitData.visit_type - Visit type
   * @param {string} visitData.status - Visit status
   * @returns {Promise<Object>} Created visit
   */
  createVisit: async (visitData) => {
    try {
      const { patient_id, visit_type = 'regular', status = 'waiting' } = visitData;
      
      const result = await db.query(
        `INSERT INTO visits (patient_id, visit_type, status) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [patient_id, visit_type, status]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  },

  /**
   * Update a visit
   * @param {number} id - Visit ID
   * @param {Object} visitData - Visit data to update
   * @returns {Promise<Object>} Updated visit
   */
  updateVisit: async (id, visitData) => {
    try {
      const { visit_type, status, doctor_id, notes } = visitData;
      
      // Build query dynamically based on provided fields
      let query = 'UPDATE visits SET ';
      const values = [];
      const updateFields = [];
      let valueIndex = 1;
      
      if (visit_type !== undefined) {
        updateFields.push(`visit_type = $${valueIndex}`);
        values.push(visit_type);
        valueIndex++;
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
      }
      
      if (doctor_id !== undefined) {
        updateFields.push(`doctor_id = $${valueIndex}`);
        values.push(doctor_id);
        valueIndex++;
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${valueIndex}`);
        values.push(notes);
        valueIndex++;
      }
      
      // Add updated_at timestamp
      updateFields.push(`updated_at = NOW()`);
      
      // If no fields to update, return the current visit
      if (updateFields.length === 1) {
        return this.getVisitById(id);
      }
      
      query += updateFields.join(', ');
      query += ` WHERE id = $${valueIndex} RETURNING *`;
      values.push(id);
      
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating visit with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Complete a visit
   * @param {number} id - Visit ID
   * @param {Object} completionData - Completion data
   * @param {string} completionData.diagnosis - Diagnosis
   * @param {string} completionData.treatment - Treatment
   * @param {string} completionData.notes - Notes
   * @returns {Promise<Object>} Completed visit
   */
  completeVisit: async (id, completionData) => {
    try {
      const { diagnosis, treatment, notes } = completionData;
      
      const result = await db.query(
        `UPDATE visits 
         SET status = 'completed', 
             diagnosis = $1, 
             treatment = $2, 
             notes = $3, 
             completed_at = NOW(), 
             updated_at = NOW() 
         WHERE id = $4 
         RETURNING *`,
        [diagnosis, treatment, notes, id]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error completing visit with ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get active visits (not completed)
   * @returns {Promise<Array>} Array of active visits
   */
  getActiveVisits: async () => {
    try {
      const result = await db.query(
        `SELECT v.*, p.name as patient_name 
         FROM visits v 
         JOIN patients p ON v.patient_id = p.id 
         WHERE v.status != 'completed' 
         ORDER BY v.created_at ASC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting active visits:', error);
      throw error;
    }
  },

  /**
   * Get visits by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of visits
   */
  getVisitsByDateRange: async (startDate, endDate) => {
    try {
      const result = await db.query(
        `SELECT v.*, p.name as patient_name 
         FROM visits v 
         JOIN patients p ON v.patient_id = p.id 
         WHERE v.created_at >= $1 AND v.created_at <= $2 
         ORDER BY v.created_at DESC`,
        [startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      console.error(`Error getting visits between ${startDate} and ${endDate}:`, error);
      throw error;
    }
  }
};

module.exports = Visit;