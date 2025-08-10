require('dotenv').config();
const db = require('../config/db');

async function checkUsersTable() {
  try {
    // Check if users table exists and has data
    const countResult = await db.query('SELECT COUNT(*) as count FROM users');
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table row count:', countResult.rows[0].count);
    console.log('Users table schema:');
    console.table(schemaResult.rows);
    
    // Check if there are any rows in the table
    if (countResult.rows[0].count > 0) {
      const sampleResult = await db.query('SELECT * FROM users LIMIT 5');
      console.log('Sample users data:');
      console.table(sampleResult.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking users table:', error);
    process.exit(1);
  }
}

checkUsersTable();
