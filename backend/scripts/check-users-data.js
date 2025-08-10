require('dotenv').config();
const db = require('../config/db');

async function checkUsersData() {
  try {
    // Check if users table has any data
    const countResult = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('Users table row count:', countResult.rows[0].count);
    
    // If there's data, show a sample
    if (countResult.rows[0].count > 0) {
      const sampleResult = await db.query('SELECT id, name, email, role, createdat FROM users LIMIT 10');
      console.log('Sample users data:');
      console.table(sampleResult.rows);
    } else {
      console.log('Users table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking users data:', error);
    process.exit(1);
  }
}

checkUsersData();
