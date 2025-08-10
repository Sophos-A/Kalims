const axios = require('axios');
const db = require('../config/db');
const Triage = require('../models/Triage');

exports.submitTriage = async (req, res) => {
  const { visitId, symptoms, vitals, patientCategory, vulnerabilityFactors } = req.body;

  try {
    // Get patient info from visit
    const patientInfo = await db.query(
      `SELECT p.id, p.name, p.dob, p.gender, p.category_id, pc.name as category_name
       FROM visits v
       JOIN patients p ON v.patientId = p.id
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       WHERE v.id = $1`,
      [visitId]
    );
    
    if (patientInfo.rows.length === 0) {
      return res.status(404).json({ error: "Visit not found" });
    }
    
    const patient = patientInfo.rows[0];
    
    // Get vulnerability factors for this patient
    const vulnResult = await db.query(
      `SELECT vf.name 
       FROM patient_vulnerabilities pv
       JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
       WHERE pv.patient_id = $1`,
      [patient.id]
    );
    
    const vulnerabilities = vulnResult.rows.map(v => v.name);
    
    // Call FastAPI AI Service with enhanced data
    const aiResponse = await axios.post(
      `${process.env.AI_ENDPOINT}/triage`,
      { 
        symptoms, 
        vitals,
        patientCategory: patientCategory || patient.category_name,
        vulnerabilityFactors: vulnerabilityFactors || vulnerabilities
      },
      {
        headers: { 
          Authorization: `Bearer ${process.env.FASTAPI_API_KEY}` 
        },
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT)
      }
    );

    const aiResult = aiResponse.data;
    const severityScore = parseFloat(aiResult.severityScore);

    // Save to database with enhanced data
    const triageRecord = await db.query(
      `INSERT INTO triage_records 
         (visitid, symptoms, severityscore, recommendations, requiresurgentcare, 
          critical_flags, patient_category, vulnerability_factors, timestamp) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [
        visitId, 
        JSON.stringify({ symptoms, vitals }), 
        severityScore,
        aiResult.recommendedAction || '',
        severityScore >= parseFloat(process.env.AI_TRIAGE_THRESHOLD),
        JSON.stringify(aiResult.criticalFlags || []),
        aiResult.patientCategory || patient.category_name,
        JSON.stringify(aiResult.vulnerabilityFactors || vulnerabilities)
      ]
    );

    // Update queue priority and estimated wait time
    try {
      // Calculate estimated wait time based on severity and position
      const queuePosition = await db.query(
        `SELECT COUNT(*) as position 
         FROM queue_positions 
         WHERE priorityscore >= $1 AND status = 'waiting'`,
        [severityScore]
      );
      
      const position = parseInt(queuePosition.rows[0].position) || 0;
      const baseWaitTime = 15; // 15 minutes base time
      const estimatedWaitTime = Math.max(5, baseWaitTime * (position + 1));
      
      await db.query(
        `UPDATE queue_positions 
         SET priorityscore = $1, estimated_wait_time = $2 
         WHERE visitid = $3`,
        [severityScore, estimatedWaitTime, visitId]
      );
      
      // If patient category was determined by AI and differs from current, update it
      if (aiResult.patientCategory && aiResult.patientCategory !== patient.category_name) {
        const categoryResult = await db.query(
          `SELECT id FROM patient_categories WHERE name = $1`,
          [aiResult.patientCategory]
        );
        
        if (categoryResult.rows.length > 0) {
          await db.query(
            `UPDATE patients SET category_id = $1 WHERE id = $2`,
            [categoryResult.rows[0].id, patient.id]
          );
        }
      }
      
      // If new vulnerability factors were identified, add them
      if (aiResult.vulnerabilityFactors && aiResult.vulnerabilityFactors.length > 0) {
        for (const vulnName of aiResult.vulnerabilityFactors) {
          // Get vulnerability factor ID
          const vulnResult = await db.query(
            `SELECT id FROM vulnerability_factors WHERE name = $1`,
            [vulnName.toLowerCase()]
          );
          
          if (vulnResult.rows.length > 0) {
            // Add to patient_vulnerabilities if not already there
            await db.query(
              `INSERT INTO patient_vulnerabilities (patient_id, vulnerability_id) 
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [patient.id, vulnResult.rows[0].id]
            );
          }
        }
      }
      
    } catch (err) {
      console.warn('Could not update queue or patient data:', err.message);
    }

    // If severity score is high, send urgent notifications
    if (severityScore >= parseFloat(process.env.AI_TRIAGE_THRESHOLD)) {
      // Import notification controller
      const notificationController = require('./notificationController');
      
      // Send urgent case notification
      await notificationController.notifyAboutUrgentCase(
        patient.id,
        triageRecord.rows[0].id,
        severityScore
      );
    }
    
    res.json({
      success: true,
      triageRecord: triageRecord.rows[0],
      aiResult,
      requiresUrgentCare: severityScore >= parseFloat(process.env.AI_TRIAGE_THRESHOLD),
      estimatedWaitTime: triageRecord.rows[0].estimated_wait_time || 'Unknown'
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