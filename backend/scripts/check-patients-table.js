require('dotenv').config();
const db = require('../config/db');

async function checkPatientsTable() {
  try {
    console.log('=== Patients Table Schema ===');
    
    // Check if patients table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patients'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Patients table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Patients table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'patients'
      ORDER BY ordinal_position
    `);
    
    console.log('\nPatients table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM patients');
    console.log(`\nTotal patients: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM patients LIMIT 5');
      console.log('\nSample patients data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nPatients table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking patients table:', error);
    process.exit(1);
  }
}

checkPatientsTable();
