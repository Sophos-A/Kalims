const db = require('../config/db');

exports.getQueue = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        qp.id,
        p.name,
        qp.priorityScore,
        qp.status,
        qp.createdAt
      FROM queue_positions qp
      JOIN patients p ON qp.patientId = p.id
      ORDER BY qp.priorityScore DESC, qp.createdAt ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Queue fetch error:", err);
    res.status(500).json({ error: "Failed to load queue" });
  }
};

exports.addToQueue = async (req, res) => {
  const { patientId, visitId } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO queue_positions (patientId, visitId, priorityScore, status) 
       VALUES ($1, $2, 0.0, 'waiting') RETURNING *`,
      [patientId, visitId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add to queue", details: err.message });
  }
};

exports.updateQueueStatus = async (req, res) => {
  const { id } = req.params;
  const { status, priorityScore } = req.body;
  try {
    const fields = [];
    const values = [];
    let index = 1;

    if (status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(status);
    }
    if (priorityScore !== undefined) {
      fields.push(`priorityScore = $${index++}`);
      values.push(priorityScore);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE queue_positions SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Queue position not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Update failed", details: err.message });
  }
};