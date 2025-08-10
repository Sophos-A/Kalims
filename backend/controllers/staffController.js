const db = require('../config/db');

/**
 * Staff Controller
 * Handles staff-related operations
 */

// Get all staff members
exports.getAllStaff = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, role, active, created_at
      FROM staff
      ORDER BY name ASC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Staff fetch error:", err);
    res.status(500).json({ error: "Failed to load staff members" });
  }
};

// Get staff member by ID
exports.getStaffById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(`
      SELECT id, name, email, role, active, created_at
      FROM staff
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Staff fetch error:", err);
    res.status(500).json({ error: "Failed to load staff member" });
  }
};

// Create a new staff member
exports.createStaff = async (req, res) => {
  const { name, email, role } = req.body;
  
  // Validate input
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required" });
  }
  
  // Validate role
  const validRoles = ['admin', 'receptionist', 'nurse', 'doctor'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be one of: admin, receptionist, nurse, doctor" });
  }
  
  try {
    const result = await db.query(`
      INSERT INTO staff (name, email, role, active)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, active, created_at
    `, [name, email, role, true]);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create staff error:", err);
    
    // Check if it's a duplicate email error
    if (err.message.includes('duplicate key value violates unique constraint')) {
      return res.status(409).json({ error: "A staff member with this email already exists" });
    }
    
    res.status(500).json({ error: "Failed to create staff member" });
  }
};

// Update staff member
exports.updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, active } = req.body;
  
  try {
    // Check if staff member exists
    const existingStaff = await db.query('SELECT id FROM staff WHERE id = $1', [id]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['admin', 'receptionist', 'nurse', 'doctor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be one of: admin, receptionist, nurse, doctor" });
      }
    }
    
    // Build dynamic update query
    let query = 'UPDATE staff SET ';
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
    
    if (role !== undefined) {
      updateFields.push(`role = $${valueIndex}`);
      values.push(role);
      valueIndex++;
    }
    
    if (active !== undefined) {
      updateFields.push(`active = $${valueIndex}`);
      values.push(active);
      valueIndex++;
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // If no fields to update, return the current staff member
    if (updateFields.length === 1) {
      return exports.getStaffById(req, res);
    }
    
    query += updateFields.join(', ');
    query += ` WHERE id = $${valueIndex} RETURNING id, name, email, role, active, created_at`;
    values.push(id);
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update staff error:", err);
    
    // Check if it's a duplicate email error
    if (err.message.includes('duplicate key value violates unique constraint')) {
      return res.status(409).json({ error: "A staff member with this email already exists" });
    }
    
    res.status(500).json({ error: "Failed to update staff member" });
  }
};

// Delete staff member
exports.deleteStaff = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if staff member exists
    const existingStaff = await db.query('SELECT id FROM staff WHERE id = $1', [id]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    // Delete staff member
    const result = await db.query(
      'DELETE FROM staff WHERE id = $1 RETURNING id',
      [id]
    );
    
    res.json({ message: "Staff member deleted successfully" });
  } catch (err) {
    console.error("Delete staff error:", err);
    res.status(500).json({ error: "Failed to delete staff member" });
  }
};
