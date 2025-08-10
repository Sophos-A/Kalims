const db = require('../config/db');
const queueService = require('../services/queueService');

/**
 * Appointment Controller
 * Handles appointment booking, retrieval, and management
 */

// Get all appointments
exports.getAppointments = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        p.name as patient_name,
        d.name as doctor_name,
        d.specialty as doctor_specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.appointment_date ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Appointments fetch error:", err);
    res.status(500).json({ error: "Failed to load appointments" });
  }
};

// Get appointments by patient ID
exports.getAppointmentsByPatientId = async (req, res) => {
  const { patientId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        p.name as patient_name,
        d.name as doctor_name,
        d.specialty as doctor_specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = $1
      ORDER BY a.appointment_date ASC
    `, [patientId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Patient appointments fetch error:", err);
    res.status(500).json({ error: "Failed to load patient appointments" });
  }
};

// Get appointments by doctor ID
exports.getAppointmentsByDoctorId = async (req, res) => {
  const { doctorId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        p.name as patient_name,
        p.contact as patient_contact,
        d.name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.doctor_id = $1
      ORDER BY a.appointment_date ASC
    `, [doctorId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Doctor appointments fetch error:", err);
    res.status(500).json({ error: "Failed to load doctor appointments" });
  }
};

// Create a new appointment
exports.createAppointment = async (req, res) => {
  const { patientId, doctorId, appointmentDate, appointmentType, reason, notes } = req.body;
  
  try {
    // Validate appointment date (must be in the future)
    const appointmentDateTime = new Date(appointmentDate);
    const now = new Date();
    
    if (appointmentDateTime < now) {
      return res.status(400).json({ error: "Appointment date must be in the future" });
    }
    
    // Check if patient and doctor exist
    const patientCheck = await db.query('SELECT id FROM patients WHERE id = $1', [patientId]);
    const doctorCheck = await db.query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
    
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    // Check for conflicting appointments (same doctor, same time slot)
    const conflictCheck = await db.query(`
      SELECT id FROM appointments 
      WHERE doctor_id = $1 
      AND appointment_date = $2 
      AND status IN ('scheduled', 'confirmed')
    `, [doctorId, appointmentDate]);
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: "Appointment time slot is already booked" });
    }
    
    // Create appointment
    const result = await db.query(`
      INSERT INTO appointments 
        (patient_id, doctor_id, appointment_date, appointment_type, reason, notes) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [patientId, doctorId, appointmentDate, appointmentType, reason, notes]);
    
    // Get full appointment details with patient and doctor names
    const appointmentResult = await db.query(`
      SELECT 
        a.*,
        p.name as patient_name,
        d.name as doctor_name,
        d.specialty as doctor_specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(appointmentResult.rows[0]);
  } catch (err) {
    console.error("Create appointment error:", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  try {
    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid appointment status" });
    }
    
    // Update appointment
    const result = await db.query(`
      UPDATE appointments 
      SET status = $1, notes = COALESCE(notes, '') || $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [status, notes ? '\n' + notes : '', id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    // If appointment is confirmed, create a visit record and add to doctor queue
    if (status === 'confirmed') {
      const appointment = result.rows[0];
      const visitResult = await db.query(`
        INSERT INTO visits 
          (patientId, visitDate, reason, status) 
        VALUES ($1, $2, $3, 'scheduled') 
        RETURNING *
      `, [appointment.patient_id, appointment.appointment_date, appointment.reason]);
      
      // Update appointment with visit_id
      await db.query(`
        UPDATE appointments 
        SET visit_id = $1 
        WHERE id = $2
      `, [visitResult.rows[0].id, id]);
      
      // Add appointment to doctor queue with high priority
      await queueService.addAppointmentToQueue(appointment.id, appointment.patient_id, visitResult.rows[0].id, appointment.appointment_date);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update appointment status error:", err);
    res.status(500).json({ error: "Failed to update appointment status" });
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  try {
    const result = await db.query(`
      UPDATE appointments 
      SET status = 'cancelled', notes = COALESCE(notes, '') || $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [notes ? '\nCancelled: ' + notes : '\nCancelled by user', id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Cancel appointment error:", err);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
};

// Reschedule appointment
exports.rescheduleAppointment = async (req, res) => {
  const { id } = req.params;
  const { newDate, notes } = req.body;
  
  try {
    // Validate new appointment date (must be in the future)
    const newDateTime = new Date(newDate);
    const now = new Date();
    
    if (newDateTime < now) {
      return res.status(400).json({ error: "New appointment date must be in the future" });
    }
    
    // Get current appointment to check doctor
    const currentAppointment = await db.query(`
      SELECT doctor_id, patient_id FROM appointments WHERE id = $1
    `, [id]);
    
    if (currentAppointment.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    const { doctor_id, patient_id } = currentAppointment.rows[0];
    
    // Check for conflicting appointments (same doctor, same time slot)
    const conflictCheck = await db.query(`
      SELECT id FROM appointments 
      WHERE doctor_id = $1 
      AND appointment_date = $2 
      AND id != $3
      AND status IN ('scheduled', 'confirmed')
    `, [doctor_id, newDate, id]);
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: "New appointment time slot is already booked" });
    }
    
    // Update appointment with new date
    const result = await db.query(`
      UPDATE appointments 
      SET appointment_date = $1, notes = COALESCE(notes, '') || $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *
    `, [newDate, notes ? '\nRescheduled: ' + notes : '\nRescheduled by user', id]);
    
    // If there was a visit associated with this appointment, update its date
    await db.query(`
      UPDATE visits 
      SET visitDate = $1 
      WHERE appointment_id = $2
    `, [newDate, id]);
    
    // Get full appointment details with patient and doctor names
    const appointmentResult = await db.query(`
      SELECT 
        a.*,
        p.name as patient_name,
        d.name as doctor_name,
        d.specialty as doctor_specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = $1
    `, [result.rows[0].id]);
    
    res.json(appointmentResult.rows[0]);
  } catch (err) {
    console.error("Reschedule appointment error:", err);
    res.status(500).json({ error: "Failed to reschedule appointment" });
  }
};
