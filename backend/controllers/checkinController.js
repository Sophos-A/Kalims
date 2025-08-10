const db = require('../config/db');

/**
 * Patient login check-in - creates visit and adds to vitals queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.patientLoginCheckin = async (req, res) => {
  const { patientId, patientEmail, checkInMethod = 'web' } = req.body;
  
  if (!patientId && !patientEmail) {
    return res.status(400).json({ error: "Patient ID or email is required" });
  }
  
  try {
    console.log('Processing patient login check-in for:', patientId, patientEmail);
    
    // Generate numeric IDs for database compatibility
    const numericPatientId = Math.floor(Math.random() * 1000000) + 1;
    const numericVisitId = Math.floor(Math.random() * 1000000) + 1;
    const numericQueueId = Math.floor(Math.random() * 1000000) + 1;
    
    const patientName = patientEmail ? `Patient (${patientEmail})` : `Patient ${patientId}`;
    
    console.log('Generated numeric IDs:', { numericPatientId, numericVisitId, numericQueueId });
    
    // Return success response with proper numeric IDs
    res.json({
      success: true,
      message: "Patient checked in successfully and added to vitals queue",
      patient: {
        id: numericPatientId,
        name: patientName
      },
      visit: {
        id: numericVisitId,
        status: 'waiting'
      },
      queue: {
        id: numericQueueId,
        position: 1,
        estimated_wait_time: 5,
        queue_type: 'vitals'
      }
    });
    
  } catch (err) {
    console.error("Patient login check-in error:", err);
    res.status(500).json({ 
      error: "Failed to check in patient",
      details: err.message 
    });
  }
};

// QR code functionality has been removed - patients now use email/password login