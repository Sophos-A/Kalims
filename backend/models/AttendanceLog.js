const db = require('../config/db');

/**
 * Attendance Log Model
 * Handles database operations for attendance logs
 */

class AttendanceLog {
  // Create a new attendance log
  static async createLog(patientId, action) {
    try {
      const result = await db.query(
        'INSERT INTO attendance_logs (patient_id, action) VALUES ($1, $2) RETURNING *',
        [patientId, action]
      );
      return result.rows[0];
    } catch (err) {
      throw new Error(`Error creating attendance log: ${err.message}`);
    }
  }

  // Get all attendance logs
  static async getAllLogs() {
    try {
      const result = await db.query('SELECT * FROM attendance_logs ORDER BY timestamp DESC');
      return result.rows;
    } catch (err) {
      throw new Error(`Error fetching attendance logs: ${err.message}`);
    }
  }

  // Get attendance logs by patient ID
  static async getLogsByPatientId(patientId) {
    try {
      const result = await db.query(
        'SELECT * FROM attendance_logs WHERE patient_id = $1 ORDER BY timestamp DESC',
        [patientId]
      );
      return result.rows;
    } catch (err) {
      throw new Error(`Error fetching attendance logs for patient: ${err.message}`);
    }
  }

  // Get attendance logs by date range
  static async getLogsByDateRange(startDate, endDate) {
    try {
      const result = await db.query(
        'SELECT * FROM attendance_logs WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC',
        [startDate, endDate]
      );
      return result.rows;
    } catch (err) {
      throw new Error(`Error fetching attendance logs by date range: ${err.message}`);
    }
  }
}

module.exports = AttendanceLog;
