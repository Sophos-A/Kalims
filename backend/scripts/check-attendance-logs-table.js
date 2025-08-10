require('dotenv').config();
const db = require('../config/db');

async function checkAttendanceLogsTable() {
  try {
    console.log('=== Attendance Logs Table Schema ===');
    
    // Check if attendance_logs table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance_logs'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Attendance logs table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Attendance logs table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance_logs'
      ORDER BY ordinal_position
    `);
    
    console.log('\nAttendance logs table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM attendance_logs');
    console.log(`\nTotal attendance logs: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM attendance_logs LIMIT 5');
      console.log('\nSample attendance logs data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nAttendance logs table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking attendance logs table:', error);
    process.exit(1);
  }
}

checkAttendanceLogsTable();
