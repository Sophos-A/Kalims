require('dotenv').config();
const db = require('../config/db');

async function checkNotificationsTable() {
  try {
    console.log('=== Notifications Table Schema ===');
    
    // Check if notifications table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Notifications table does not exist in the database.');
      process.exit(0);
    }
    
    console.log('Notifications table exists.');
    
    // Get table schema
    const schemaResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `);
    
    console.log('\nNotifications table columns:');
    console.table(schemaResult.rows);
    
    // Check row count
    const countResult = await db.query('SELECT COUNT(*) as count FROM notifications');
    console.log(`\nTotal notifications: ${countResult.rows[0].count}`);
    
    // Show sample data if table is not empty
    if (countResult.rows[0].count !== '0') {
      const sampleResult = await db.query('SELECT * FROM notifications LIMIT 5');
      console.log('\nSample notifications data:');
      console.table(sampleResult.rows);
    } else {
      console.log('\nNotifications table is empty.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking notifications table:', error);
    process.exit(1);
  }
}

checkNotificationsTable();
