const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * @route   GET /api/queue
 * @desc    Get current triage queue (sorted by priority)
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        qp.id,
        p.id AS patientId,
        p.name,
        qp.priorityScore,
        qp.status,
        qp.createdat AS queuedAt,
        EXTRACT(EPOCH FROM (NOW() - qp.createdat)) / 60 AS waitMinutes
      FROM queue_positions qp
      JOIN patients p ON qp.patientId = p.id
      ORDER BY qp.priorityScore DESC, qp.createdat ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /queue error:', err);
    res.status(500).json({
      error: 'Failed to load queue',
      details: err.message
    });
  }
});

/**
 * @route   POST /api/queue
 * @desc    Add a patient to the queue (manual override)
 * @body    { patientId, visitId }
 * @access  Private
 */
router.post('/', async (req, res) => {
  const { patientId, visitId } = req.body;

  if (!patientId || !visitId) {
    return res.status(400).json({
      error: 'patientId and visitId are required'
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO queue_positions (patientId, visitId, priorityScore, status) 
       VALUES ($1, $2, 0.0, 'waiting') 
       RETURNING *`,
      [patientId, visitId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /queue error:', err);
    res.status(500).json({
      error: 'Failed to add to queue',
      details: err.message
    });
  }
});

/**
 * @route   PUT /api/queue/:id
 * @desc    Update queue status or priority (e.g., mark as in-progress)
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, priorityScore } = req.body;

  const fields = [];
  const values = [];
  let index = 1;

  if (status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(status);
  }
  if (priorityScore !== undefined) {
    fields.push(`priorityScore = $${index++}`);
    values.push(parseFloat(priorityScore));
  }

  if (fields.length === 0) {
    return res.status(400).json({
      error: 'No fields to update'
    });
  }

  values.push(id); // For WHERE clause

  try {
    const result = await db.query(
      `UPDATE queue_positions SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Queue position not found'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /queue/:id error:', err);
    res.status(500).json({
      error: 'Update failed',
      details: err.message
    });
  }
});

module.exports = router;