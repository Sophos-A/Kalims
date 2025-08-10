require('dotenv').config();
const db = require('../config/db');

async function checkStaffTable() {
  try {
    console.log('=== Staff Table Schema ===');
    
    // Check if staff table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Staff table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Staff table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'staff'
      ORDER BY ordinal_position
    `);
    
    console.log('\nStaff table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM staff');
    console.log(`\nTotal staff members: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM staff LIMIT 5');
      console.log('\nSample staff data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nStaff table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking staff table:', error);
    process.exit(1);
  }
}

checkStaffTable();
