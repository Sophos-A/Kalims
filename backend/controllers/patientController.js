const db = require('../config/db');

exports.getAllPatients = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, dob, gender, phone, email, address, medicalHistory, createdAt 
       FROM patients ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get patients error:", err);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
};

exports.getPatientById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM patients WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

exports.createPatient = async (req, res) => {
  const { name, dob, gender, phone, email, address, medicalHistory } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO patients (name, dob, gender, phone, email, address, medicalHistory) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, dob, gender, phone, email, address, medicalHistory]
    );
    
    // Auto-create visit and queue entry
    const visit = await db.query(
      `INSERT INTO visits (patientId, checkInTime, status) 
       VALUES ($1, NOW(), 'registered') RETURNING id`,
      [result.rows[0].id]
    );

    await db.query(
      `INSERT INTO queue_positions (patientId, visitId, priorityScore, status) 
       VALUES ($1, $2, 0.0, 'waiting')`,
      [result.rows[0].id, visit.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create patient error:", err);
    res.status(500).json({ error: "Failed to register patient", details: err.message });
  }
};

exports.updatePatient = async (req, res) => {
  const { id } = req.params;
  const fields = ['name', 'dob', 'gender', 'phone', 'email', 'address', 'medicalHistory'];
  const values = fields.map(f => req.body[f]).filter(v => v !== undefined);
  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  if (values.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await db.query(
      `UPDATE patients SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Update failed", details: err.message });
  }
};