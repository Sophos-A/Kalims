const db = require('../config/db');
const Queue = require('../models/Queue');

exports.getQueue = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        qp.id,
        p.id as patient_id,
        p.name,
        p.dob,
        p.gender,
        pc.name as category_name,
        qp.display_number,
        qp.priorityScore,
        qp.status,
        qp.estimated_wait_time,
        qp.last_status_change,
        qp.createdAt,
        v.checkInTime,
        v.check_in_method,
        v.doctor_id,
        ARRAY_AGG(DISTINCT vf.name) as vulnerabilities,
        tr.severityscore as triage_score,
        tr.recommendations as triage_recommendations
      FROM queue_positions qp
      JOIN patients p ON qp.patientId = p.id
      JOIN visits v ON qp.visitId = v.id
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      LEFT JOIN patient_vulnerabilities pv ON p.id = pv.patient_id
      LEFT JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
      LEFT JOIN triage_records tr ON v.id = tr.visitid
      WHERE qp.status != 'completed'
      GROUP BY qp.id, p.id, pc.name, v.id, tr.id
      ORDER BY qp.priorityScore DESC, qp.createdAt ASC
    `);
    
    // Calculate position in queue for each patient
    const queueWithPosition = result.rows.map((patient, index) => ({
      ...patient,
      position: index + 1,
      estimated_wait_time: calculateWaitTime(index, patient.category_name)
    }));
    
    res.json(queueWithPosition);
  } catch (err) {
    console.error("Queue fetch error:", err);
    res.status(500).json({ error: "Failed to load queue" });
  }
};

// Helper function to calculate estimated wait time
function calculateWaitTime(position, category) {
  // Base wait time: 10 minutes per person ahead in queue
  let baseWait = position * 10;
  
  // Adjust based on category
  switch(category) {
    case 'new': 
      // New patients take longer
      baseWait *= 1.5;
      break;
    case 'follow-up':
      // Follow-ups are usually quicker
      baseWait *= 0.8;
      break;
    case 'post-op':
      // Post-op checks are medium length
      baseWait *= 1.0;
      break;
    case 'referral':
      // Referrals may take longer to assess
      baseWait *= 1.3;
      break;
    default:
      // No adjustment
      break;
  }
  
  return Math.round(baseWait);
}

exports.addToQueue = async (req, res) => {
  const { patientId, visitId, checkInMethod = 'manual' } = req.body;
  try {
    // Get patient information including category and vulnerabilities
    const patientInfo = await db.query(`
      SELECT 
        p.id, p.category_id, pc.name as category_name, pc.priority_weight,
        ARRAY_AGG(vf.id) as vulnerability_ids,
        COALESCE(SUM(vf.priority_boost), 0) as vulnerability_boost
      FROM patients p
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      LEFT JOIN patient_vulnerabilities pv ON p.id = pv.patient_id
      LEFT JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
      WHERE p.id = $1
      GROUP BY p.id, pc.id
    `, [patientId]);
    
    if (patientInfo.rows.length === 0) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    // Calculate priority score based on category and vulnerabilities
    const patient = patientInfo.rows[0];
    let priorityScore = 0.0;
    
    // Add category priority weight
    if (patient.priority_weight) {
      priorityScore += parseFloat(patient.priority_weight);
    }
    
    // Add vulnerability boost
    if (patient.vulnerability_boost) {
      priorityScore += parseFloat(patient.vulnerability_boost);
    }
    
    // Cap priority score at 1.0
    priorityScore = Math.min(priorityScore, 1.0);
    
    // Update visit with check-in method
    await db.query(
      `UPDATE visits SET check_in_method = $1, checkInTime = NOW() WHERE id = $2`,
      [checkInMethod, visitId]
    );
    
    // Generate display number (format: A001, B002, etc. based on category)
    let displayPrefix = 'A';
    if (patient.category_name) {
      displayPrefix = patient.category_name.toUpperCase().charAt(0);
    }
    
    // Get current count for this category today
    const countResult = await db.query(`
      SELECT COUNT(*) FROM queue_positions qp 
      JOIN visits v ON qp.visitId = v.id 
      JOIN patients p ON v.patientId = p.id 
      WHERE p.category_id = $1 AND DATE(v.checkInTime) = CURRENT_DATE
    `, [patient.category_id]);
    
    const count = parseInt(countResult.rows[0].count) + 1;
    const displayNumber = `${displayPrefix}${count.toString().padStart(3, '0')}`;
    
    // Add to queue with calculated priority and display number
    const result = await db.query(
      `INSERT INTO queue_positions 
        (patientId, visitId, priorityScore, status, display_number, estimated_wait_time, last_status_change) 
       VALUES ($1, $2, $3, 'waiting', $4, 30, NOW()) RETURNING *`,
      [patientId, visitId, priorityScore, displayNumber]
    );
    
    // Log attendance
    await db.query(
      `INSERT INTO attendance_logs (patient_id, visit_id, check_in_time, status, notes) 
       VALUES ($1, $2, NOW(), 'checked-in', $3)`,
      [patientId, visitId, `Checked in via ${checkInMethod}`]
    );
    
    // Return queue position with additional info
    const queueInfo = await db.query(`
      SELECT 
        qp.*, 
        p.name as patient_name,
        pc.name as category_name
      FROM queue_positions qp
      JOIN patients p ON qp.patientId = p.id
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      WHERE qp.id = $1
    `, [result.rows[0].id]);
    
    // Calculate position in queue for the new patient
    const queuePositionResult = await db.query(`
      SELECT 
        COUNT(*) as position
      FROM queue_positions
      WHERE status = 'waiting' AND priorityScore >= $1 AND id != $2
    `, [queueInfo.rows[0].priorityscore, queueInfo.rows[0].id]);

    const position = parseInt(queuePositionResult.rows[0].position) + 1;
    
    // Broadcast queue update via WebSocket
    if (global.webSocketService) {
      // Get min and max wait times
      const waitTime = queueInfo.rows[0].estimated_wait_time || 30;
      const minWaitTime = Math.floor(waitTime * 0.8);
      const maxWaitTime = Math.ceil(waitTime * 1.2);
      
      // Prepare data for WebSocket broadcast
      const queueUpdateData = {
        queueId: queueInfo.rows[0].id,
        patientId: queueInfo.rows[0].patientid,
        position: position,
        status: 'waiting',
        estimated_wait_time: waitTime,
        min_wait_time: minWaitTime,
        max_wait_time: maxWaitTime,
        queue_type: 'doctor',
        display_number: queueInfo.rows[0].display_number,
        last_updated: new Date().toISOString()
      };
      
      // Broadcast to all clients subscribed to the queue channel
      global.webSocketService.broadcastQueueUpdate(queueUpdateData);
    }
    
    res.status(201).json(queueInfo.rows[0]);
  } catch (err) {
    console.error("Add to queue error:", err);
    res.status(500).json({ error: "Failed to add to queue", details: err.message });
  }
};

exports.updateQueueStatus = async (req, res) => {
  const { id } = req.params;
  const { status, priorityScore, doctorId, notes } = req.body;
  try {
    // First get the current queue position to access related data
    const queueData = await db.query(
      `SELECT qp.*, v.id as visit_id, p.id as patient_id, p.name as patient_name, 
       pc.name as category_name, qp.display_number, qp.priorityScore
       FROM queue_positions qp 
       JOIN visits v ON qp.visitId = v.id 
       JOIN patients p ON qp.patientId = p.id 
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       WHERE qp.id = $1`,
      [id]
    );
    
    if (queueData.rows.length === 0) {
      return res.status(404).json({ error: "Queue position not found" });
    }
    
    const queueItem = queueData.rows[0];
    const fields = [];
    const values = [];
    let index = 1;

    if (status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(status);
      fields.push(`last_status_change = NOW()`);
      
      // Import notification controller
      const notificationController = require('./notificationController');
      
      // If status is 'in-progress', update the visit with doctor assignment
      if (status === 'in-progress' && doctorId) {
        await db.query(
          `UPDATE visits SET doctor_id = $1, status = 'in-progress' WHERE id = $2`,
          [doctorId, queueItem.visit_id]
        );
        
        // Notify the doctor about the patient assignment
        await notificationController.notifyDoctorAboutPatient(
          doctorId, 
          queueItem.patient_id, 
          id,
          queueItem.priorityScore >= 0.7 ? 'high' : 'normal'
        );
        
        // Get triage data if available
        const triageData = await db.query(
          `SELECT * FROM triage_records 
           WHERE visitid = $1 
           ORDER BY id DESC LIMIT 1`,
          [queueItem.visit_id]
        );

        // If patient has high severity score, send urgent notification
        if (triageData.rows.length > 0 && triageData.rows[0].severityscore >= 0.7) {
          await notificationController.notifyAboutUrgentCase(
            queueItem.patient_id,
            triageData.rows[0].id,
            triageData.rows[0].severityscore
          );
        }
      }
      
      // If status is 'completed', update attendance log with checkout time
      if (status === 'completed') {
        await db.query(
          `UPDATE visits SET status = 'completed' WHERE id = $1`,
          [queueItem.visit_id]
        );
        
        // Log attendance checkout
        await db.query(
          `INSERT INTO attendance_logs (patient_id, visit_id, check_out_time, status, notes) 
           VALUES ($1, $2, NOW(), 'checked-out', $3)`,
          [queueItem.patient_id, queueItem.visit_id, notes || 'Consultation completed']
        );
        
        // Notify staff about completed consultation
        const staffResult = await db.query(
          `SELECT id FROM staff WHERE role = 'receptionist' OR role = 'admin'`
        );

        for (const staff of staffResult.rows) {
          await notificationController.notifyStaffAboutQueueStatus(
            staff.id,
            `Patient ${queueItem.patient_name} (${queueItem.display_number}) consultation completed`,
            id
          );
        }
      }
      
      // If status is 'no-show', log in attendance_logs
      if (status === 'no-show') {
        await db.query(
          `UPDATE visits SET status = 'no-show' WHERE id = $1`,
          [queueItem.visit_id]
        );
        
        // Log attendance no-show
        await db.query(
          `INSERT INTO attendance_logs (patient_id, visit_id, status, notes) 
           VALUES ($1, $2, 'no-show', $3)`,
          [queueItem.patient_id, queueItem.visit_id, notes || 'Patient did not show up']
        );
      }
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

    // Get updated queue position with patient info
    const updatedQueue = await db.query(`
      SELECT 
        qp.*, 
        p.name as patient_name,
        pc.name as category_name,
        v.doctor_id,
        v.id as visit_id,
        tr.severityscore,
        tr.recommendations
      FROM queue_positions qp
      JOIN patients p ON qp.patientId = p.id
      JOIN visits v ON qp.visitId = v.id
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      LEFT JOIN triage_records tr ON v.id = tr.visitid
      WHERE qp.id = $1
      ORDER BY tr.id DESC LIMIT 1
    `, [id]);

    // Broadcast queue update via WebSocket
    if (global.webSocketService) {
      // Calculate position in queue for the updated patient
      const queuePositionResult = await db.query(`
        SELECT 
          COUNT(*) as position
        FROM queue_positions
        WHERE status = 'waiting' AND priorityScore >= $1 AND id != $2
      `, [updatedQueue.rows[0].priorityscore, id]);

      const position = parseInt(queuePositionResult.rows[0].position) + 1;
      
      // Get min and max wait times
      const waitTime = updatedQueue.rows[0].estimated_wait_time || 30;
      const minWaitTime = Math.floor(waitTime * 0.8);
      const maxWaitTime = Math.ceil(waitTime * 1.2);
      
      // Prepare data for WebSocket broadcast
      const queueUpdateData = {
        queueId: updatedQueue.rows[0].id,
        patientId: updatedQueue.rows[0].patientid,
        position: position,
        status: updatedQueue.rows[0].status,
        estimated_wait_time: waitTime,
        min_wait_time: minWaitTime,
        max_wait_time: maxWaitTime,
        queue_type: 'doctor',
        display_number: updatedQueue.rows[0].display_number,
        severity_score: updatedQueue.rows[0].severityscore,
        last_updated: new Date().toISOString()
      };
      
      // Broadcast to all clients subscribed to the queue channel
      global.webSocketService.broadcastQueueUpdate(queueUpdateData);
    }

    res.json(updatedQueue.rows[0]);
  } catch (err) {
    console.error("Update queue status error:", err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
};

// Add new endpoint to get queue statistics
exports.getQueueStats = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE qp.status = 'waiting') as waiting_count,
        COUNT(*) FILTER (WHERE qp.status = 'in-progress') as in_progress_count,
        COUNT(*) FILTER (WHERE qp.status = 'completed') as completed_today,
        AVG(EXTRACT(EPOCH FROM (v.updated_at - v.checkInTime)) / 60) FILTER (WHERE qp.status = 'completed') as avg_wait_time_minutes,
        COUNT(*) FILTER (WHERE pc.name = 'new') as new_patients,
        COUNT(*) FILTER (WHERE pc.name = 'follow-up') as followup_patients,
        COUNT(*) FILTER (WHERE pc.name = 'post-op') as postop_patients,
        COUNT(*) FILTER (WHERE pc.name = 'referral') as referral_patients
      FROM queue_positions qp
      JOIN visits v ON qp.visitId = v.id
      JOIN patients p ON qp.patientId = p.id
      LEFT JOIN patient_categories pc ON p.category_id = pc.id
      WHERE DATE(v.checkInTime) = CURRENT_DATE
    `);
    
    res.json(stats.rows[0]);
  } catch (err) {
    console.error("Queue stats error:", err);
    res.status(500).json({ error: "Failed to get queue statistics" });
  }
};