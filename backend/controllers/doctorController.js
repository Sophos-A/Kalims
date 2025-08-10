const db = require('../config/db');

/**
 * Doctor Controller
 * Handles doctor-related operations
 */

// Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, specialty, active, created_at
      FROM doctors
      ORDER BY name ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Doctors fetch error:", err);
    res.status(500).json({ error: "Failed to load doctors" });
  }
};

// Get doctor by ID
exports.getDoctorById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(`
      SELECT id, name, email, specialty, active, created_at
      FROM doctors
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Doctor fetch error:", err);
    res.status(500).json({ error: "Failed to load doctor" });
  }
};

// Create a new doctor
exports.createDoctor = async (req, res) => {
  const { name, email, specialty } = req.body;
  
  // Validate input
  if (!name || !email || !specialty) {
    return res.status(400).json({ error: "Name, email, and specialty are required" });
  }
  
  try {
    const result = await db.query(`
      INSERT INTO doctors (name, email, specialty, active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, specialty, active, created_at
    `, [name, email, specialty, true]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create doctor error:", err);
    
    // Check if it's a duplicate email error
    if (err.message.includes('duplicate key value violates unique constraint')) {
      return res.status(409).json({ error: "A doctor with this email already exists" });
    }
    
    res.status(500).json({ error: "Failed to create doctor" });
  }
};

// Update doctor
exports.updateDoctor = async (req, res) => {
  const { id } = req.params;
  const { name, email, specialty, active } = req.body;
  
  try {
    // Check if doctor exists
    const existingDoctor = await db.query('SELECT id FROM doctors WHERE id = $1', [id]);
    if (existingDoctor.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    // Build dynamic update query
    let query = 'UPDATE doctors SET ';
    const values = [];
    const updateFields = [];
    let valueIndex = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${valueIndex}`);
      values.push(name);
      valueIndex++;
    }
    
    if (email !== undefined) {
      updateFields.push(`email = $${valueIndex}`);
      values.push(email);
      valueIndex++;
    }
    
    if (specialty !== undefined) {
      updateFields.push(`specialty = $${valueIndex}`);
      values.push(specialty);
      valueIndex++;
    }
    
    if (active !== undefined) {
      updateFields.push(`active = $${valueIndex}`);
      values.push(active);
      valueIndex++;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update, return the current doctor
    if (updateFields.length === 1) {
      return exports.getDoctorById(req, res);
    }
    
    query += updateFields.join(', ');
    query += ` WHERE id = $${valueIndex} RETURNING id, name, email, specialty, active, created_at`;
    values.push(id);
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update doctor error:", err);
    
    // Check if it's a duplicate email error
    if (err.message.includes('duplicate key value violates unique constraint')) {
      return res.status(409).json({ error: "A doctor with this email already exists" });
    }
    
    res.status(500).json({ error: "Failed to update doctor" });
  }
};

// Delete doctor
exports.deleteDoctor = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if doctor has appointments
    const appointmentCount = await db.query(
      'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = $1',
      [id]
    );
    
    if (appointmentCount.rows[0].count > 0) {
      return res.status(400).json({
        error: "Cannot delete doctor with existing appointments. Please reschedule or cancel appointments first."
      });
    }
    
    // Delete doctor
    const result = await db.query(
      'DELETE FROM doctors WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    res.json({ message: "Doctor deleted successfully" });
  } catch (err) {
    console.error("Delete doctor error:", err);
    res.status(500).json({ error: "Failed to delete doctor" });
  }
};
