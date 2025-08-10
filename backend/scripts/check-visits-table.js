require('dotenv').config();
const db = require('../config/db');

async function checkVisitsTable() {
  try {
    console.log('=== Visits Table Schema ===');
    
    // Check if visits table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'visits'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Visits table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Visits table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'visits'
      ORDER BY ordinal_position
    `);
    
    console.log('\nVisits table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM visits');
    console.log(`\nTotal visits: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM visits LIMIT 5');
      console.log('\nSample visits data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nVisits table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking visits table:', error);
    process.exit(1);
  }
}

checkVisitsTable();
