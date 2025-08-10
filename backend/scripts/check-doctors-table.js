require('dotenv').config();
const db = require('../config/db');

async function checkDoctorsTable() {
  try {
    console.log('=== Doctors Table Schema ===');
    
    // Check if doctors table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'doctors'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Doctors table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Doctors table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'doctors'
      ORDER BY ordinal_position
    `);
    
    console.log('\nDoctors table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM doctors');
    console.log(`\nTotal doctors: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM doctors LIMIT 5');
      console.log('\nSample doctors data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nDoctors table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking doctors table:', error);
    process.exit(1);
  }
}

checkDoctorsTable();
