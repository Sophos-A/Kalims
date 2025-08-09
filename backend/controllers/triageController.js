const axios = require('axios');
const db = require('../config/db');

exports.submitTriage = async (req, res) => {
  const { visitId, symptoms, vitals } = req.body;

  try {
    // Call FastAPI AI Service
    const aiResponse = await axios.post(
      `${process.env.AI_ENDPOINT}/triage`,
      { symptoms, vitals },
      {
        headers: { 
          Authorization: `Bearer ${process.env.FASTAPI_API_KEY}` 
        },
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT)
      }
    );

    const aiResult = aiResponse.data;
    const severityScore = parseFloat(aiResult.severityScore);

    // Save to database (matching Supabase schema)
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

    res.json({
      success: true,
      triageRecord: triageRecord.rows[0],
      aiResult,
      requiresUrgentCare: severityScore >= parseFloat(process.env.AI_TRIAGE_THRESHOLD)
    });

  } catch (err) {
    console.error("Triage error:", err.message);
    res.status(500).json({
      error: "Triage assessment failed",
      details: err.response?.data || err.message
    });
  }
};

exports.getTriageHistory = async (req, res) => {
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
    res.status(500).json({ error: "Failed to fetch history", details: err.message });
  }
};

exports.getTriageById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM triage_records WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Triage record not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
};