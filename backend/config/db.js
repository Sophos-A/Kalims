const { Pool } = require('pg');
require('dotenv').config();

// Configuration from environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    // Supabase requires SSL
    rejectUnauthorized: false, // Necessary for self-signed certs in poolers
  },
  connectionTimeoutMillis: 5000,  // 5 seconds to connect
  idleTimeoutMillis: 20000,      // Close idle clients after 20s
  max: 20,                       // Max 20 connections in the pool
});

// Optional: Log connection success/failure
pool.on('connect', () => {
  console.log('✅ PostgreSQL pool connected to Supabase');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

// Test the connection on startup (optional, but helpful)
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log(`🟢 Database connected successfully. Time: ${res.rows[0].now}`);
    client.release();
  } catch (err) {
    console.error('🔴 Failed to connect to PostgreSQL:', err.message);
    process.exit(1); // Exit if DB is unreachable
  }
};

// Only run connection test when this file is executed directly
if (require.main === module) {
  testConnection();
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: async () => await pool.connect(),
};