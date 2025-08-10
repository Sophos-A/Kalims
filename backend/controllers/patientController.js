const db = require('../config/db');
const Patient = require('../models/Patient');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

exports.getAllPatients = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id, p.name, p.dob, p.gender, p.phone, p.email, p.address, 
        p.medicalHistory, p.createdAt, p.qr_code, p.category_id,
        pc.name as category_name,
        ARRAY_AGG(DISTINCT vf.name) as vulnerabilities
      FROM patients p
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      LEFT JOIN patient_vulnerabilities pv ON p.id = pv.patient_id
      LEFT JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
      GROUP BY p.id, pc.name
      ORDER BY p.name
    `);
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
  const { 
    name, dob, gender, phone, email, address, medicalHistory, 
    category_id, vulnerabilities 
  } = req.body;
  
  try {
    // Generate unique QR code
    const qrCode = uuidv4();
    const qrImageBase64 = await QRCode.toDataURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/${qrCode}`);
    
    // Insert patient with QR code and category
    const result = await db.query(
      `INSERT INTO patients (name, dob, gender, phone, email, address, medicalHistory, qr_code, category_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [name, dob, gender, phone, email, address, medicalHistory, qrCode, category_id]
    );
    
    const patientId = result.rows[0].id;
    
    // Add vulnerability factors if provided
    if (vulnerabilities && vulnerabilities.length > 0) {
      for (const vulnId of vulnerabilities) {
        await db.query(
          `INSERT INTO patient_vulnerabilities (patient_id, vulnerability_id) 
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [patientId, vulnId]
        );
      }
    }
    
    // Auto-create visit and queue entry
    const visit = await db.query(
      `INSERT INTO visits (patientId, checkInTime, status, check_in_method) 
       VALUES ($1, NOW(), 'registered', 'manual') RETURNING id`,
      [patientId]
    );

    // Calculate initial priority score based on category and vulnerabilities
    let priorityScore = 0.0;
    
    // Get category priority weight
    if (category_id) {
      const categoryResult = await db.query(
        'SELECT priority_weight FROM patient_categories WHERE id = $1',
        [category_id]
      );
      if (categoryResult.rows.length > 0) {
        priorityScore += categoryResult.rows[0].priority_weight;
      }
    }
    
    // Add vulnerability boosts
    if (vulnerabilities && vulnerabilities.length > 0) {
      const vulnResult = await db.query(
        'SELECT SUM(priority_boost) as total_boost FROM vulnerability_factors WHERE id = ANY($1::int[])',
        [vulnerabilities]
      );
      if (vulnResult.rows.length > 0 && vulnResult.rows[0].total_boost) {
        priorityScore += parseFloat(vulnResult.rows[0].total_boost);
      }
    }
    
    // Cap priority score at 1.0
    priorityScore = Math.min(priorityScore, 1.0);
    
    // Generate display number (format: A001, B002, etc. based on category)
    let displayPrefix = 'A';
    if (category_id) {
      const categoryResult = await db.query(
        'SELECT name FROM patient_categories WHERE id = $1',
        [category_id]
      );
      if (categoryResult.rows.length > 0) {
        const categoryName = categoryResult.rows[0].name.toUpperCase();
        displayPrefix = categoryName.charAt(0);
      }
    }
    
    // Get current count for this category today
    const countResult = await db.query(
      `SELECT COUNT(*) FROM queue_positions qp 
       JOIN visits v ON qp.visitId = v.id 
       JOIN patients p ON v.patientId = p.id 
       WHERE p.category_id = $1 AND DATE(v.checkInTime) = CURRENT_DATE`,
      [category_id]
    );
    
    const count = parseInt(countResult.rows[0].count) + 1;
    const displayNumber = `${displayPrefix}${count.toString().padStart(3, '0')}`;
    
    // Add to queue with calculated priority and display number
    await db.query(
      `INSERT INTO queue_positions (patientId, visitId, priorityScore, status, display_number, estimated_wait_time) 
       VALUES ($1, $2, $3, 'waiting', $4, 30)`,
      [patientId, visit.rows[0].id, priorityScore, displayNumber]
    );

    // Return patient with QR code image
    res.status(201).json({
      ...result.rows[0],
      qrImageBase64,
      displayNumber
    });
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