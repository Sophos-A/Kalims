require('dotenv').config();
const db = require('../config/db');

async function checkTriageRecordsTable() {
  try {
    console.log('=== Triage Records Table Schema ===');
    
    // Check if triage_records table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'triage_records'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Triage records table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Triage records table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'triage_records'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTriage records table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM triage_records');
    console.log(`\nTotal triage records: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM triage_records LIMIT 5');
      console.log('\nSample triage records data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nTriage records table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking triage records table:', error);
    process.exit(1);
  }
}

checkTriageRecordsTable();
