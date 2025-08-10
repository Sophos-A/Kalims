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
 * @route   GET /api/queue/stats
 * @desc    Get queue statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) AS totalPatients,
        AVG(EXTRACT(EPOCH FROM (NOW() - qp.createdat)) / 60) AS avgWaitMinutes,
        MAX(EXTRACT(EPOCH FROM (NOW() - qp.createdat)) / 60) AS maxWaitMinutes
      FROM queue_positions qp
      WHERE qp.status = 'waiting'
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /queue/stats error:', err);
    res.status(500).json({
      error: 'Failed to load queue statistics',
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

/**
 * @route   GET /api/queue/status/:id
 * @desc    Get status of a specific queue position with wait time estimates
 * @access  Public
 */
router.get('/status/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get queue position details
    const queueResult = await db.query(`
      SELECT 
        qp.id,
        qp.patientId,
        qp.visitId,
        qp.status,
        qp.priorityScore,
        qp.display_number,
        qp.estimated_wait_time,
        qp.createdat,
        v.checkInTime,
        tr.severityscore,
        p.createdat as registration_date,
        p.id as patient_id
      FROM queue_positions qp
      JOIN visits v ON qp.visitId = v.id
      JOIN patients p ON qp.patientId = p.id
      LEFT JOIN triage_records tr ON v.id = tr.visitid
      WHERE qp.id = $1
      ORDER BY tr.id DESC LIMIT 1
    `, [id]);
    
    if (queueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Queue position not found' });
    }
    
    const queueData = queueResult.rows[0];
    
    // Calculate position in queue
    const positionResult = await db.query(`
      SELECT 
        COUNT(*) as position
      FROM queue_positions
      WHERE status = 'waiting' AND priorityScore >= $1 AND id != $2
    `, [queueData.priorityscore, id]);
    
    const position = parseInt(positionResult.rows[0].position) + 1;
    
    // Calculate min and max wait times
    const waitTime = queueData.estimated_wait_time || 30;
    const minWaitTime = Math.floor(waitTime * 0.8);
    const maxWaitTime = Math.ceil(waitTime * 1.2);
    
    // Determine queue type
    const queueType = queueData.severityscore !== null ? 'doctor' : 'vitals';
    
    // Return queue status with position and wait time estimates
    console.log('Queue data being sent:', {
      patientId: queueData.patientid,
      patient_id: queueData.patient_id,
      registrationDate: queueData.registration_date,
      queueEntryTime: queueData.createdat
    });
    
    res.json({
      queueId: queueData.id,
      patientId: queueData.patientid,
      patient_id: queueData.patient_id,
      position: position,
      status: queueData.status,
      estimated_wait_time: waitTime,
      min_wait_time: minWaitTime,
      max_wait_time: maxWaitTime,
      queue_type: queueType,
      display_number: queueData.display_number,
      checkInTime: queueData.checkintime,
      queueEntryTime: queueData.createdat,
      registrationDate: queueData.registration_date
    });
  } catch (err) {
    console.error('GET /queue/status/:id error:', err);
    res.status(500).json({
      error: 'Failed to get queue status',
      details: err.message
    });
  }
});

module.exports = router;