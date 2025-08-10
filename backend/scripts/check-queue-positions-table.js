require('dotenv').config();
const db = require('../config/db');

async function checkQueuePositionsTable() {
  try {
    console.log('=== Queue Positions Table Schema ===');
    
    // Check if queue_positions table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'queue_positions'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Queue positions table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Queue positions table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'queue_positions'
      ORDER BY ordinal_position
    `);
    
    console.log('\nQueue positions table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM queue_positions');
    console.log(`\nTotal queue positions: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM queue_positions LIMIT 5');
      console.log('\nSample queue positions data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nQueue positions table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking queue positions table:', error);
    process.exit(1);
  }
}

checkQueuePositionsTable();
