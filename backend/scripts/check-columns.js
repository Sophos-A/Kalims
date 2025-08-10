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

async function checkColumns() {
  const client = await pool.connect();
  try {
    // Check triage_records columns
    const triageRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'triage_records';
    `);
    
    console.log('triage_records columns:', triageRes.rows.map(r => r.column_name).join(', '));
    
    // Check visits columns
    const visitsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'visits';
    `);
    
    console.log('visits columns:', visitsRes.rows.map(r => r.column_name).join(', '));
    
  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkColumns();
