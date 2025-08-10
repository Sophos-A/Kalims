/**
 * Queue model for database operations
 */
const db = require('../config/db');

/**
 * Get all queue positions
 * @returns {Promise<Array>} Array of queue position objects
 */
exports.getAllQueuePositions = async () => {
  try {
    const result = await db.query(
      `SELECT qp.*, v.patient_id, p.name as patient_name, p.gender, p.dob,
              tr.symptoms, tr.urgency_level, tr.severityscore,
              d.name as doctor_name
       FROM queue_positions qp
       JOIN visits v ON qp.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN triage_records tr ON tr.visit_id = v.id
       LEFT JOIN doctors d ON v.doctor_id = d.id
       ORDER BY qp.position ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching queue positions:', error);
    throw error;
  }
};

/**
 * Get queue position by ID
 * @param {number} id - Queue position ID
 * @returns {Promise<Object>} Queue position object
 */
exports.getQueuePositionById = async (id) => {
  try {
    const result = await db.query(
      `SELECT qp.*, v.patient_id, p.name as patient_name, p.gender, p.dob,
              tr.symptoms, tr.urgency_level, tr.severityscore,
              d.name as doctor_name
       FROM queue_positions qp
       JOIN visits v ON qp.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       LEFT JOIN triage_records tr ON tr.visit_id = v.id
       LEFT JOIN doctors d ON v.doctor_id = d.id
       WHERE qp.id = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching queue position with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Update queue position status
 * @param {number} id - Queue position ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated queue position
 */
exports.updateQueueStatus = async (id, status) => {
  try {
    const result = await db.query(
      `UPDATE queue_positions 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating queue position status with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Assign doctor to a queue position
 * @param {number} id - Queue position ID
 * @param {number} doctorId - Doctor ID
 * @returns {Promise<Object>} Updated queue position
 */
exports.assignDoctor = async (id, doctorId) => {
  try {
    // First update the visit record
    const queuePosition = await db.query(
      'SELECT visit_id FROM queue_positions WHERE id = $1',
      [id]
    );
    
    if (queuePosition.rows.length === 0) {
      throw new Error('Queue position not found');
    }
    
    const visitId = queuePosition.rows[0].visit_id;
    
    // Update the visit with doctor assignment
    await db.query(
      'UPDATE visits SET doctor_id = $1 WHERE id = $2',
      [doctorId, visitId]
    );
    
    // Update queue status to 'with-doctor'
    const result = await db.query(
      `UPDATE queue_positions 
       SET status = 'with-doctor', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error(`Error assigning doctor to queue position with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Add a new patient to the queue
 * @param {number} visitId - Visit ID
 * @param {string} status - Initial status
 * @returns {Promise<Object>} Created queue position
 */
exports.addToQueue = async (visitId, status = 'waiting') => {
  try {
    // Get the next position number
    const positionResult = await db.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM queue_positions WHERE status != \'completed\''
    );
    
    const position = positionResult.rows[0].next_position;
    
    // Create a new queue position
    const result = await db.query(
      `INSERT INTO queue_positions (visit_id, position, status, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING *`,
      [visitId, position, status]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
};