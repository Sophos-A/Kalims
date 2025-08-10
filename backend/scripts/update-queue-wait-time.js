/**
 * Script to add estimated_wait_time column to queue_positions table
 */
const db = require('../config/db');
require('dotenv').config();

async function updateQueueSchema() {
  try {
    console.log('Starting queue_positions table schema update for estimated_wait_time...');
    
    // Check if estimated_wait_time column exists
    const columnCheck = await db.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'queue_positions' AND column_name = 'estimated_wait_time'`
    );
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding estimated_wait_time column to queue_positions table...');
      
      // Add estimated_wait_time column
      await db.query(
        `ALTER TABLE queue_positions 
         ADD COLUMN estimated_wait_time INTEGER DEFAULT 0`
      );
      
      console.log('estimated_wait_time column added successfully.');
    } else {
      console.log('estimated_wait_time column already exists.');
    }
    
    console.log('Queue positions table schema update completed successfully!');
    
  } catch (error) {
    console.error('Error updating queue schema:', error);
  } finally {
    process.exit();
  }
}

// Run the function
updateQueueSchema();