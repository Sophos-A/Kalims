const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

async function checkTableSchema() {
  try {
    const client = await pool.connect();
    
    // Check triage_records table
    const triageResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'triage_records'
      ORDER BY ordinal_position;
    `);
    
    // Check visits table
    const visitsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'visits'
      ORDER BY ordinal_position;
    `);
    
    // Check patients table
    const patientsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'patients'
      ORDER BY ordinal_position;
    `);
    
    // Check queue_positions table
    const queueResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'queue_positions'
      ORDER BY ordinal_position;
    `);

    console.log('=== Database Schema ===');
    console.log('\nTable: triage_records');
    console.table(triageResult.rows);
    
    console.log('\nTable: visits');
    console.table(visitsResult.rows);
    
    console.log('\nTable: patients');
    console.table(patientsResult.rows);
    
    console.log('\nTable: queue_positions');
    console.table(queueResult.rows);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error checking database schema:', error);
    process.exit(1);
  }
}

checkTableSchema();
