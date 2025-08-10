const express = require('express');
const axios = require('axios');
const db = require('../config/db');

const router = express.Router();

/**
 * @route   POST /api/triage
 * @desc    Submit symptoms to AI for severity scoring
 * @body    { visitId, symptoms, vitals }
 * @access  Private
 */
router.post('/', async (req, res) => {
  const { visitId, symptoms, vitals } = req.body;

  if (!visitId || !symptoms) {
    return res.status(400).json({
      error: 'visitId and symptoms are required'
    });
  }

  try {
    console.log('Making AI triage request to:', `${process.env.AI_ENDPOINT}/triage`);
    console.log('Request payload:', { symptoms, vitals });
    console.log('API Key (first 10 chars):', process.env.FASTAPI_API_KEY?.substring(0, 10));
    console.log('Timeout setting:', process.env.AI_SERVICE_TIMEOUT);
    
    const aiResponse = await axios.post(
      `${process.env.AI_ENDPOINT}/triage`,
      { symptoms, vitals },
      {
        headers: {
          'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT)
      }
    );

    const aiResult = aiResponse.data;
    const severityScore = parseFloat(aiResult.severityScore);

    // Save triage result (matching Supabase schema)
    const triageRecord = await db.query(
      `INSERT INTO triage_records 
         (visitid, symptoms, severityscore, recommendations, requiresurgentcare, timestamp) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [
        visitId, 
        JSON.stringify({ symptoms, vitals }), 
        severityScore,
        aiResult.recommendedAction || '',
        severityScore >= parseFloat(process.env.AI_TRIAGE_THRESHOLD)
      ]
    );

    // Update queue priority (if queue_positions table exists)
    try {
      await db.query(
        `UPDATE queue_positions SET priorityscore = $1 WHERE visitid = $2`,
        [severityScore, visitId]
      );
    } catch (err) {
      console.warn('Could not update queue_positions:', err.message);
    }

    // Update visit status
    await db.query(
      `UPDATE visits SET status = 'triaged' WHERE id = $1`,
      [visitId]
    );

    res.json({
      success: true,
      triageRecordId: triageRecord.rows[0].id,
      severityScore,
      recommendedAction: aiResult.recommendedAction,
      criticalFlags: aiResult.criticalFlags,
      requiresUrgentCare: severityScore >= parseFloat(process.env.AI_TRIAGE_THRESHOLD),
      updatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Triage error details:');
    console.error('- Error message:', err.message);
    console.error('- Error code:', err.code);
    console.error('- Response status:', err.response?.status);
    console.error('- Response data:', err.response?.data);
    console.error('- Request URL:', err.config?.url);
    console.error('- Full error:', err);
    
    res.status(500).json({
      error: 'Triage assessment failed',
      details: err.response?.data || err.message,
      errorCode: err.code,
      statusCode: err.response?.status
    });
  }
});

/**
 * @route   GET /api/triage/history
 * @desc    Get all triage records
 * @access  Private
 */
router.get('/history', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        tr.*, 
        p.name as patientname,
        v.checkintime as checkintime,
        v.status as visitstatus
      FROM triage_records tr
      JOIN visits v ON tr.visitid = v.id
      JOIN patients p ON v.patientid = p.id
      ORDER BY tr.timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /triage/history error:', err);
    res.status(500).json({
      error: 'Failed to fetch triage history',
      details: err.message
    });
  }
});

/**
 * @route   GET /api/triage/:id
 * @desc    Get a specific triage record
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM triage_records WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Triage record not found'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /triage/:id error:', err);
    res.status(500).json({
      error: 'Database error',
      details: err.message
    });
  }
});

module.exports = router;