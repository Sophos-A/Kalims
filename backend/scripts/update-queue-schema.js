/**
 * Script to update the queue_positions table schema
 */
const db = require('../config/db');
require('dotenv').config();

async function updateQueueSchema() {
  try {
    console.log('Starting queue_positions table schema update...');
    
    // Check if queue_type column exists
    const columnCheck = await db.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'queue_positions' AND column_name = 'queue_type'`
    );
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding queue_type column to queue_positions table...');
      
      // Add queue_type column
      await db.query(
        `ALTER TABLE queue_positions 
         ADD COLUMN queue_type VARCHAR(20) DEFAULT 'vitals'`
      );
      
      console.log('queue_type column added successfully.');
    } else {
      console.log('queue_type column already exists.');
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