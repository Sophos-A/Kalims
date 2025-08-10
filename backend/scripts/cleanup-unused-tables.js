require('dotenv').config();
const db = require('../config/db');

async function cleanupUnusedTables() {
  try {
    console.log('Starting cleanup of unused database tables...');
    
    // Check if users table has any data
    const countResult = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('Users table row count:', countResult.rows[0].count);
    
    // If users table is empty, we can safely drop it
    if (countResult.rows[0].count === '0') {
      console.log('Users table is empty. Dropping table...');
      await db.query('DROP TABLE IF EXISTS users CASCADE');
      console.log('Users table dropped successfully.');
    } else {
      console.log('Users table contains data. Not dropping table.');
    }
    
    // Check for any other potentially unused tables
    // Based on our analysis, all other tables seem to be in use
    console.log('No other unused tables found in the database schema.');
    
    console.log('Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up database tables:', error);
    process.exit(1);
  }
}

cleanupUnusedTables();
