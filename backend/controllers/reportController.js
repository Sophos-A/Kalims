const db = require('../config/db');
const { format } = require('date-fns');

/**
 * Report controller for generating and exporting data
 * about patient attendance, categories, and queue statistics
 */

// Get daily attendance report
exports.getDailyAttendanceReport = async (req, res) => {
  const { date } = req.query;
  const reportDate = date ? new Date(date) : new Date();
  
  try {
    // Format date for SQL query
    const formattedDate = format(reportDate, 'yyyy-MM-dd');
    
    // Get attendance data for the specified date
    const attendanceData = await db.query(
      `SELECT 
         p.id as patient_id, 
         p.name as patient_name, 
         p.gender, 
         p.dob, 
         pc.name as category, 
         v.id as visit_id,
         v.check_in_method,
         al.action,
         al.notes,
         al.timestamp as action_time,
         qp.display_number,
         qp.status as queue_status,
         d.name as doctor_name,
         tr.severityscore,
         tr.recommendations
       FROM attendance_logs al
       JOIN patients p ON al.patient_id = p.id
       JOIN visits v ON al.visit_id = v.id
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       LEFT JOIN queue_positions qp ON qp.visitid = v.id
       LEFT JOIN doctors d ON v.doctor_id = d.id
       LEFT JOIN triage_records tr ON tr.visitid = v.id
       WHERE DATE(al.timestamp) = $1
       ORDER BY al.timestamp ASC`,
      [formattedDate]
    );
    
    // Get summary statistics
    const summaryStats = await db.query(
      `SELECT 
         COUNT(DISTINCT al.patient_id) as total_patients,
         COUNT(DISTINCT CASE WHEN al.action = 'checkin' THEN al.patient_id END) as checked_in,
         COUNT(DISTINCT CASE WHEN qp.status = 'completed' THEN al.patient_id END) as completed,
         COUNT(DISTINCT CASE WHEN al.action = 'no-show' THEN al.patient_id END) as no_shows,
         COUNT(DISTINCT CASE WHEN pc.name = 'New' THEN al.patient_id END) as new_patients,
         COUNT(DISTINCT CASE WHEN pc.name = 'Follow-up' THEN al.patient_id END) as followup_patients,
         COUNT(DISTINCT CASE WHEN pc.name = 'Post-op' THEN al.patient_id END) as postop_patients,
         COUNT(DISTINCT CASE WHEN pc.name = 'Referral' THEN al.patient_id END) as referral_patients,
         AVG(EXTRACT(EPOCH FROM (qp.last_status_change - v.created_at))/60) as avg_wait_time_minutes
       FROM attendance_logs al
       JOIN patients p ON al.patient_id = p.id
       JOIN visits v ON al.visit_id = v.id
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       LEFT JOIN queue_positions qp ON qp.visitid = v.id
       WHERE DATE(al.timestamp) = $1`,
      [formattedDate]
    );
    
    // Get vulnerability statistics
    const vulnerabilityStats = await db.query(
      `SELECT 
         vf.name as vulnerability_factor,
         COUNT(DISTINCT pv.patient_id) as patient_count
       FROM attendance_logs al
       JOIN patient_vulnerabilities pv ON al.patient_id = pv.patient_id
       JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
       WHERE DATE(al.timestamp) = $1
       GROUP BY vf.name
       ORDER BY patient_count DESC`,
      [formattedDate]
    );
    
    res.json({
      success: true,
      date: formattedDate,
      attendance: attendanceData.rows,
      summary: summaryStats.rows[0],
      vulnerabilityStats: vulnerabilityStats.rows
    });
  } catch (error) {
    console.error('Error generating daily attendance report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// Get date range report
exports.getDateRangeReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  try {
    // Format dates for SQL query
    const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
    const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');
    
    // Get daily summary for the date range
    const dailySummary = await db.query(
      `SELECT 
         DATE(al.timestamp) as date,
         COUNT(DISTINCT al.patient_id) as total_patients,
         COUNT(DISTINCT CASE WHEN al.action = 'checkin' THEN al.patient_id END) as checked_in,
         COUNT(DISTINCT CASE WHEN qp.status = 'completed' THEN al.patient_id END) as completed,
         COUNT(DISTINCT CASE WHEN al.action = 'no-show' THEN al.patient_id END) as no_shows,
         AVG(EXTRACT(EPOCH FROM (qp.last_status_change - v.created_at))/60) as avg_wait_time_minutes
       FROM attendance_logs al
       JOIN visits v ON al.visit_id = v.id
       LEFT JOIN queue_positions qp ON qp.visitid = v.id
       WHERE DATE(al.timestamp) BETWEEN $1 AND $2
       GROUP BY DATE(al.timestamp)
       ORDER BY DATE(al.timestamp) ASC`,
      [formattedStartDate, formattedEndDate]
    );
    
    // Get category breakdown for the date range
    const categoryBreakdown = await db.query(
      `SELECT 
         pc.name as category,
         COUNT(DISTINCT al.patient_id) as patient_count
       FROM attendance_logs al
       JOIN patients p ON al.patient_id = p.id
       LEFT JOIN patient_categories pc ON p.category_id = pc.id
       WHERE DATE(al.timestamp) BETWEEN $1 AND $2
       GROUP BY pc.name
       ORDER BY patient_count DESC`,
      [formattedStartDate, formattedEndDate]
    );
    
    // Get vulnerability breakdown for the date range
    const vulnerabilityBreakdown = await db.query(
      `SELECT 
         vf.name as vulnerability_factor,
         COUNT(DISTINCT pv.patient_id) as patient_count
       FROM attendance_logs al
       JOIN patient_vulnerabilities pv ON al.patient_id = pv.patient_id
       JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
       WHERE DATE(al.timestamp) BETWEEN $1 AND $2
       GROUP BY vf.name
       ORDER BY patient_count DESC`,
      [formattedStartDate, formattedEndDate]
    );
    
    // Get repeat visitor statistics
    const repeatVisitors = await db.query(
      `SELECT 
         p.id as patient_id,
         p.name as patient_name,
         COUNT(DISTINCT v.id) as visit_count
       FROM attendance_logs al
       JOIN patients p ON al.patient_id = p.id
       JOIN visits v ON al.visit_id = v.id
       WHERE DATE(al.timestamp) BETWEEN $1 AND $2
       GROUP BY p.id, p.name
       HAVING COUNT(DISTINCT v.id) > 1
       ORDER BY visit_count DESC
       LIMIT 20`,
      [formattedStartDate, formattedEndDate]
    );
    
    // Get no-show statistics
    const noShowStats = await db.query(
      `SELECT 
         p.id as patient_id,
         p.name as patient_name,
         COUNT(DISTINCT CASE WHEN al.action = 'no-show' THEN v.id END) as no_show_count
       FROM attendance_logs al
       JOIN patients p ON al.patient_id = p.id
       JOIN visits v ON al.visit_id = v.id
       WHERE DATE(al.timestamp) BETWEEN $1 AND $2 AND al.action = 'no-show'
       GROUP BY p.id, p.name
       ORDER BY no_show_count DESC
       LIMIT 20`,
      [formattedStartDate, formattedEndDate]
    );
    
    res.json({
      success: true,
      dateRange: {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      },
      dailySummary: dailySummary.rows,
      categoryBreakdown: categoryBreakdown.rows,
      vulnerabilityBreakdown: vulnerabilityBreakdown.rows,
      repeatVisitors: repeatVisitors.rows,
      noShowStats: noShowStats.rows
    });
  } catch (error) {
    console.error('Error generating date range report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// Export data in CSV format
exports.exportDataCSV = async (req, res) => {
  const { type, startDate, endDate } = req.query;
  
  if (!type || !startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Export type, start date, and end date are required' 
    });
  }
  
  try {
    // Format dates for SQL query
    const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
    const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');
    
    let data = [];
    let filename = '';
    let headers = [];
    
    // Different export types
    switch (type) {
      case 'attendance':
        // Export attendance data
        const attendanceResult = await db.query(
          `SELECT 
             p.id as patient_id, 
             p.name as patient_name, 
             p.gender, 
             p.dob, 
             pc.name as category, 
             v.id as visit_id,
             v.check_in_method,
             v.created_at as visit_date,
             al.action,
             al.notes,
             al.timestamp as action_time,
             qp.display_number,
             qp.status as queue_status,
             d.name as doctor_name
           FROM attendance_logs al
           JOIN patients p ON al.patient_id = p.id
           JOIN visits v ON al.visit_id = v.id
           LEFT JOIN patient_categories pc ON p.category_id = pc.id
           LEFT JOIN queue_positions qp ON qp.visitid = v.id
           LEFT JOIN doctors d ON v.doctor_id = d.id
           WHERE DATE(al.timestamp) BETWEEN $1 AND $2
           ORDER BY al.timestamp ASC`,
          [formattedStartDate, formattedEndDate]
        );
        
        data = attendanceResult.rows;
        filename = `attendance_${formattedStartDate}_to_${formattedEndDate}.csv`;
        headers = [
          'Patient ID', 'Patient Name', 'Gender', 'Date of Birth', 'Category',
          'Visit ID', 'Check-in Method', 'Visit Date', 'Action', 'Notes',
          'Action Time', 'Display Number', 'Queue Status', 'Doctor Name'
        ];
        break;
        
      case 'triage':
        // Export triage data
        const triageResult = await db.query(
          `SELECT 
             p.id as patient_id, 
             p.name as patient_name, 
             p.gender, 
             p.dob, 
             pc.name as category, 
             v.id as visit_id,
             tr.id as triage_id,
             tr.timestamp as triage_time,
             tr.severityscore,
             tr.recommendations,
             tr.requiresurgentcare,
             tr.critical_flags,
             tr.patient_category,
             tr.vulnerability_factors
           FROM triage_records tr
           JOIN visits v ON tr.visitid = v.id
           JOIN patients p ON v.patientId = p.id
           LEFT JOIN patient_categories pc ON p.category_id = pc.id
           WHERE DATE(tr.timestamp) BETWEEN $1 AND $2
           ORDER BY tr.timestamp ASC`,
          [formattedStartDate, formattedEndDate]
        );
        
        data = triageResult.rows;
        filename = `triage_${formattedStartDate}_to_${formattedEndDate}.csv`;
        headers = [
          'Patient ID', 'Patient Name', 'Gender', 'Date of Birth', 'Category',
          'Visit ID', 'Triage ID', 'Triage Time', 'Severity Score', 'Recommendations',
          'Requires Urgent Care', 'Critical Flags', 'AI-Determined Category', 'Vulnerability Factors'
        ];
        break;
        
      case 'queue':
        // Export queue data
        const queueResult = await db.query(
          `SELECT 
             p.id as patient_id, 
             p.name as patient_name, 
             p.gender, 
             p.dob, 
             pc.name as category, 
             v.id as visit_id,
             v.created_at as visit_date,
             qp.id as queue_id,
             qp.display_number,
             qp.status as queue_status,
             qp.priorityscore,
             qp.estimated_wait_time,
             qp.created_at as queue_entry_time,
             qp.last_status_change,
             d.name as doctor_name,
             EXTRACT(EPOCH FROM (qp.last_status_change - v.created_at))/60 as wait_time_minutes
           FROM queue_positions qp
           JOIN visits v ON qp.visitid = v.id
           JOIN patients p ON qp.patientId = p.id
           LEFT JOIN patient_categories pc ON p.category_id = pc.id
           LEFT JOIN doctors d ON v.doctor_id = d.id
           WHERE DATE(qp.created_at) BETWEEN $1 AND $2
           ORDER BY qp.created_at ASC`,
          [formattedStartDate, formattedEndDate]
        );
        
        data = queueResult.rows;
        filename = `queue_${formattedStartDate}_to_${formattedEndDate}.csv`;
        headers = [
          'Patient ID', 'Patient Name', 'Gender', 'Date of Birth', 'Category',
          'Visit ID', 'Visit Date', 'Queue ID', 'Display Number', 'Queue Status',
          'Priority Score', 'Estimated Wait Time', 'Queue Entry Time', 'Last Status Change',
          'Doctor Name', 'Actual Wait Time (minutes)'
        ];
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    // Convert data to CSV format
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '_');
        let value = row[key] || '';
        
        // Format date values
        if (value instanceof Date) {
          value = format(value, 'yyyy-MM-dd HH:mm:ss');
        }
        
        // Handle JSON fields
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        
        // Escape commas and quotes
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"')) {
            value = `"${value.replace(/"/g, '""')}"`;  
          }
        }
        
        return value;
      });
      
      csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Send CSV data
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};