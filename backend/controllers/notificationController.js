const db = require('../config/db');

/**
 * Notification controller for sending alerts to doctors and staff
 * about patient queue status, urgent cases, and other clinic events
 */

// Get all notifications for a specific user (doctor or staff)
exports.getNotifications = async (req, res) => {
  const { userId, userType } = req.query;
  
  try {
    const notifications = await db.query(
      `SELECT * FROM notifications 
       WHERE recipient_id = $1 AND recipient_type = $2
       ORDER BY created_at DESC LIMIT 50`,
      [userId, userType]
    );
    
    res.json({
      success: true,
      notifications: notifications.rows
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  const { notificationId } = req.params;
  
  try {
    const result = await db.query(
      `UPDATE notifications 
       SET read = true, read_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [notificationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({
      success: true,
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// Create a new notification
exports.createNotification = async (notificationData) => {
  const { 
    recipient_id, 
    recipient_type, 
    message, 
    type, 
    related_id,
    related_type,
    priority = 'normal' 
  } = notificationData;
  
  try {
    const result = await db.query(
      `INSERT INTO notifications 
         (recipient_id, recipient_type, message, type, related_id, related_type, priority, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING *`,
      [recipient_id, recipient_type, message, type, related_id, related_type, priority]
    );
    
    return { success: true, notification: result.rows[0] };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
};

// Notify doctor about a new patient assigned to them
exports.notifyDoctorAboutPatient = async (doctorId, patientId, queueId, priority = 'normal') => {
  try {
    // Get patient details
    const patientResult = await db.query(
      `SELECT p.name, p.id, pc.name as category_name, qp.display_number
       FROM patients p
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       LEFT JOIN queue_positions qp ON qp.patientid = p.id
       WHERE p.id = $1 AND qp.id = $2`,
      [patientId, queueId]
    );
    
    if (patientResult.rows.length === 0) {
      return { success: false, error: 'Patient not found' };
    }
    
    const patient = patientResult.rows[0];
    
    // Create notification message
    const message = `New patient: ${patient.name} (${patient.display_number}) - ${patient.category_name} category`;
    
    return await this.createNotification({
      recipient_id: doctorId,
      recipient_type: 'doctor',
      message,
      type: 'new_patient',
      related_id: patientId,
      related_type: 'patient',
      priority
    });
  } catch (error) {
    console.error('Error notifying doctor:', error);
    return { success: false, error: 'Failed to notify doctor' };
  }
};

// Notify staff about urgent cases or queue status changes
exports.notifyStaffAboutQueueStatus = async (staffId, message, relatedId = null, priority = 'normal') => {
  try {
    return await this.createNotification({
      recipient_id: staffId,
      recipient_type: 'staff',
      message,
      type: 'queue_status',
      related_id: relatedId,
      related_type: 'queue',
      priority
    });
  } catch (error) {
    console.error('Error notifying staff:', error);
    return { success: false, error: 'Failed to notify staff' };
  }
};

// Notify about urgent cases based on AI triage
exports.notifyAboutUrgentCase = async (patientId, triageId, severityScore) => {
  try {
    // Get patient details
    const patientResult = await db.query(
      `SELECT p.name, p.id, qp.display_number, v.id as visit_id
       FROM patients p
       LEFT JOIN visits v ON v.patientId = p.id
       LEFT JOIN queue_positions qp ON qp.visitid = v.id
       WHERE p.id = $1 AND qp.status = 'waiting'
       ORDER BY v.created_at DESC LIMIT 1`,
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      return { success: false, error: 'Patient not found in queue' };
    }
    
    const patient = patientResult.rows[0];
    
    // Get all active doctors
    const doctorsResult = await db.query(
      `SELECT id FROM doctors WHERE active = true`
    );
    
    // Get all admin staff
    const staffResult = await db.query(
      `SELECT id FROM staff WHERE role = 'admin'`
    );
    
    const message = `URGENT CASE: Patient ${patient.name} (${patient.display_number}) has severity score ${severityScore.toFixed(2)} and requires immediate attention!`;
    
    // Notify all doctors
    for (const doctor of doctorsResult.rows) {
      await this.createNotification({
        recipient_id: doctor.id,
        recipient_type: 'doctor',
        message,
        type: 'urgent_case',
        related_id: patientId,
        related_type: 'patient',
        priority: 'high'
      });
    }
    
    // Notify all admin staff
    for (const staff of staffResult.rows) {
      await this.createNotification({
        recipient_id: staff.id,
        recipient_type: 'staff',
        message,
        type: 'urgent_case',
        related_id: patientId,
        related_type: 'patient',
        priority: 'high'
      });
    }
    
    return { success: true, message: 'Notifications sent to all doctors and admin staff' };
  } catch (error) {
    console.error('Error notifying about urgent case:', error);
    return { success: false, error: 'Failed to send urgent case notifications' };
  }
};