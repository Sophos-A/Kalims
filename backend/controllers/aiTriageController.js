/**
 * AI Triage Engine Controller
 * Handles the AI-powered triage scoring and queue management
 */
const db = require('../config/db');
const axios = require('axios');
const notificationController = require('./notificationController');

/**
 * Process vitals data and generate triage score
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.processTriage = async (req, res) => {
  const { patientId, vitals, notes } = req.body;
  
  try {
    // Get patient information
    const patientResult = await db.query(
      `SELECT p.id, p.name, p.dob, p.gender, p.category_id, 
              pc.name as category_name,
              ARRAY_AGG(DISTINCT vf.name) as vulnerabilities
       FROM patients p
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       LEFT JOIN patient_vulnerabilities pv ON p.id = pv.patient_id
       LEFT JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
       WHERE p.id = $1
       GROUP BY p.id, pc.name`,
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    const patient = patientResult.rows[0];
    
    // Find active visit for this patient
    const visitResult = await db.query(
      `SELECT id FROM visits 
       WHERE patientId = $1 AND status = 'waiting'
       ORDER BY checkInTime DESC LIMIT 1`,
      [patientId]
    );
    
    if (visitResult.rows.length === 0) {
      return res.status(404).json({ error: "No active visit found for this patient" });
    }
    
    const visitId = visitResult.rows[0].id;
    
    // Call AI service for triage scoring
    const aiResponse = await axios.post(
      `${process.env.AI_ENDPOINT}/triage`,
      { 
        symptoms: notes || "No symptoms provided", 
        vitals: {
          heartRate: vitals.heartRate,
          respiratoryRate: vitals.respiratoryRate,
          bloodPressure: vitals.bloodPressure,
          oxygenSaturation: vitals.oxygenSaturation,
          weight: vitals.weight
        },
        patientCategory: patient.category_name,
        vulnerabilityFactors: patient.vulnerabilities || []
      },
      {
        headers: { 
          Authorization: `Bearer ${process.env.FASTAPI_API_KEY}` 
        },
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || 5000)
      }
    );

    const aiResult = aiResponse.data;
    const triageScore = parseFloat(aiResult.severityScore);

    // Save triage record
    await db.query(
      `INSERT INTO triage_records 
         (visitid, symptoms, vitals_data, severityscore, recommendations, 
          requiresurgentcare, critical_flags, timestamp) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        visitId, 
        notes || "No symptoms provided", 
        JSON.stringify(vitals),
        triageScore,
        aiResult.recommendedAction,
        triageScore > 0.8, // High priority if score > 0.8
        JSON.stringify(aiResult.criticalFlags)
      ]
    );

    // Update queue position based on triage score
    await updateQueuePosition(visitId, triageScore);
    
    // Notify staff about high-priority patients (score > 0.8)
    if (triageScore > 0.8) {
      await notificationController.notifyAboutUrgentCase(patientId, null, triageScore);
    }
    
    // Get updated queue position
    const queueResult = await db.query(
      `SELECT position, estimated_wait_time 
       FROM queue_positions 
       WHERE visitId = $1`,
      [visitId]
    );
    
    res.json({
      success: true,
      triageScore,
      recommendations: aiResult.recommendedAction,
      criticalFlags: aiResult.criticalFlags,
      queuePosition: queueResult.rows[0]?.position,
      estimatedWaitTime: queueResult.rows[0]?.estimated_wait_time
    });
  } catch (err) {
    console.error("AI Triage error:", err);
    res.status(500).json({ error: "Failed to process triage data" });
  }
};

/**
 * Update queue position based on triage score
 * @param {number} visitId - Visit ID
 * @param {number} triageScore - Triage score (0.0-1.0)
 */
async function updateQueuePosition(visitId, triageScore) {
  try {
    // Get current queue
    const queueResult = await db.query(
      `SELECT id, visitId, priorityScore 
       FROM queue_positions 
       WHERE status = 'waiting' 
       ORDER BY priorityScore DESC, createdAt ASC`
    );
    
    const queue = queueResult.rows;
    
    // Find current position
    const currentIndex = queue.findIndex(item => item.visitId === visitId);
    
    if (currentIndex === -1) {
      // Not in queue, add it
      await db.query(
        `INSERT INTO queue_positions (visitId, priorityScore, status, estimated_wait_time) 
         VALUES ($1, $2, 'waiting', 30)`,
        [visitId, triageScore]
      );
      return;
    }
    
    // Update triage score
    await db.query(
      `UPDATE queue_positions 
       SET priorityScore = $1 
       WHERE visitId = $2`,
      [triageScore, visitId]
    );
    
    // If high priority (> 0.8), reorder queue
    if (triageScore > 0.8) {
      // Find position where this patient should be
      let newPosition = 0;
      while (newPosition < queue.length && 
             queue[newPosition].priorityScore >= triageScore && 
             queue[newPosition].visitId !== visitId) {
        newPosition++;
      }
      
      // Update positions for all affected patients
      await db.query(
        `UPDATE queue_positions 
         SET position = 
           CASE 
             WHEN visitId = $1 THEN $2 
             WHEN position >= $2 AND position < $3 THEN position + 1 
             ELSE position 
           END 
         WHERE status = 'waiting'`,
        [visitId, newPosition, currentIndex]
      );
    }
    
    // Update estimated wait times
    await updateWaitTimes();
    
    // Broadcast queue update via WebSocket
    if (global.io) {
      const updatedQueueResult = await db.query(
        `SELECT qp.id, qp.visitId, qp.position, qp.priorityScore, qp.status, 
                qp.estimated_wait_time, qp.min_wait_time, qp.max_wait_time,
                p.id as patient_id, p.name, tr.severityscore, tr.critical_flags
         FROM queue_positions qp
         JOIN visits v ON qp.visitId = v.id
         JOIN patients p ON v.patientId = p.id
         LEFT JOIN triage_records tr ON v.id = tr.visitid
         WHERE qp.status = 'waiting'
         ORDER BY qp.priorityScore DESC, v.checkInTime ASC`
      );
      global.io.emit('queue_updated', { 
        timestamp: new Date().toISOString(),
        queue: updatedQueueResult.rows
      });
    }
  } catch (err) {
    console.error("Queue update error:", err);
    throw err;
  }
}

/**
 * Update estimated wait times for all patients in queue
 * Uses AI-driven dynamic wait time calculation based on multiple factors
 */
async function updateWaitTimes() {
  try {
    // Get current queue order with patient information
    const queueResult = await db.query(
      `SELECT 
         qp.id, qp.visitId, qp.position, qp.priorityScore,
         p.id as patient_id, p.name, p.dob, p.gender, pc.name as category_name,
         v.checkInTime, EXTRACT(EPOCH FROM (NOW() - v.checkInTime))/60 as wait_time_minutes,
         tr.symptoms, tr.vitals_data, tr.severityscore, tr.critical_flags
       FROM queue_positions qp
       JOIN visits v ON qp.visitId = v.id
       JOIN patients p ON v.patientId = p.id
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       LEFT JOIN triage_records tr ON v.id = tr.visitid
       WHERE qp.status = 'waiting' 
       ORDER BY qp.priorityScore DESC, v.checkInTime ASC`
    );
    
    const queue = queueResult.rows;
    
    // Get current staff availability
    const staffResult = await db.query(
      `SELECT COUNT(*) as available_staff 
       FROM staff 
       WHERE status = 'available' AND role = 'doctor'`
    );
    
    const availableStaff = parseInt(staffResult.rows[0]?.available_staff || 1);
    
    // Calculate average service time based on historical data
    const serviceTimeResult = await db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (completion_time - start_time))/60) as avg_service_minutes,
              PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY EXTRACT(EPOCH FROM (completion_time - start_time))/60) as median_service_minutes,
              severityscore,
              COUNT(*) as visit_count
       FROM visits v
       JOIN triage_records tr ON v.id = tr.visitid
       WHERE v.status = 'completed'
       AND v.completion_time IS NOT NULL
       AND v.start_time IS NOT NULL
       GROUP BY tr.severityscore
       LIMIT 100`
    );
    
    // Create a map of severity scores to service times for more accurate predictions
    const serviceTimeMap = {};
    serviceTimeResult.rows.forEach(row => {
      serviceTimeMap[row.severityscore] = {
        avg: parseFloat(row.avg_service_minutes || 15),
        median: parseFloat(row.median_service_minutes || 15),
        count: parseInt(row.visit_count || 0)
      };
    });
    
    const avgServiceTime = parseFloat(serviceTimeResult.rows[0]?.avg_service_minutes || 15);
    
    // Update wait times with more accurate AI-driven calculation
    for (let i = 0; i < queue.length; i++) {
      // Base calculation factors
      const position = i;
      const positionFactor = Math.ceil(position / Math.max(1, availableStaff));
      
      // Patient-specific factors
      const severityScore = parseFloat(queue[i].severityscore || 0.5);
      const criticalFlags = queue[i].critical_flags ? JSON.parse(queue[i].critical_flags) : [];
      const criticalFlagCount = Array.isArray(criticalFlags) ? criticalFlags.length : 0;
      
      // Adjust priority based on severity and critical flags
      const priorityFactor = 1 - (severityScore * 0.6); // Higher severity = lower wait time
      const criticalAdjustment = criticalFlagCount * 0.05; // Each critical flag reduces wait time by 5%
      
      // Use severity-specific service time if available
      let baseWaitTime = avgServiceTime; // Default
      if (serviceTimeMap[severityScore] && serviceTimeMap[severityScore].count > 5) {
        // Use median for more stable predictions when we have enough data
        baseWaitTime = serviceTimeMap[severityScore].median;
      }
      
      // Calculate estimated wait time range
      const adjustedFactor = Math.max(0.4, priorityFactor - criticalAdjustment);
      const minWaitTime = Math.max(3, Math.round(baseWaitTime * positionFactor * adjustedFactor * 0.8));
      const maxWaitTime = Math.round(baseWaitTime * positionFactor * adjustedFactor * 1.2);
      const estimatedWaitTime = Math.round((minWaitTime + maxWaitTime) / 2);
      
      // Store both min and max for range display
      await db.query(
        `UPDATE queue_positions 
         SET estimated_wait_time = $1,
             min_wait_time = $2,
             max_wait_time = $3,
             last_updated = NOW()
         WHERE id = $4`,
        [estimatedWaitTime, minWaitTime, maxWaitTime, queue[i].id]
      );
    }
    
    // Emit real-time updates via WebSocket if available
    if (global.io) {
      global.io.emit('queue_updated', { timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error("Wait time update error:", err);
    throw err;
  }
}

/**
 * Get vitals queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVitalsQueue = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        v.id as visit_id,
        p.id as patient_id,
        p.name,
        p.dob,
        p.gender,
        pc.name as category_name,
        v.checkInTime,
        v.check_in_method,
        EXTRACT(EPOCH FROM (NOW() - v.checkInTime))/60 as wait_time_minutes
      FROM visits v
      JOIN patients p ON v.patientId = p.id
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      WHERE v.status = 'waiting' AND v.id NOT IN (
        SELECT visitid FROM triage_records
      )
      ORDER BY v.checkInTime ASC
    `);
    
    // Add position in queue
    const queueWithPosition = result.rows.map((patient, index) => ({
      ...patient,
      position: index + 1,
      estimated_wait_time: (index + 1) * 5 // 5 minutes per patient for vitals
    }));
    
    res.json(queueWithPosition);
  } catch (err) {
    console.error("Vitals queue fetch error:", err);
    res.status(500).json({ error: "Failed to load vitals queue" });
  }
};

/**
 * Get doctor queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDoctorQueue = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        qp.id,
        p.id as patient_id,
        p.name,
        p.dob,
        p.gender,
        pc.name as category_name,
        qp.priorityScore as triage_score,
        qp.status,
        qp.estimated_wait_time,
        v.checkInTime,
        tr.recommendations,
        tr.critical_flags
      FROM queue_positions qp
      JOIN visits v ON qp.visitId = v.id
      JOIN patients p ON v.patientId = p.id
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      LEFT JOIN triage_records tr ON v.id = tr.visitid
      WHERE qp.status = 'waiting' AND tr.id IS NOT NULL
      ORDER BY qp.priorityScore DESC, v.checkInTime ASC
    `);
    
    // Add position in queue
    const queueWithPosition = result.rows.map((patient, index) => ({
      ...patient,
      position: index + 1
    }));
    
    res.json(queueWithPosition);
  } catch (err) {
    console.error("Doctor queue fetch error:", err);
    res.status(500).json({ error: "Failed to load doctor queue" });
  }
};