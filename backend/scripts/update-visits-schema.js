/**
 * Script to update the visits table schema
 */
const db = require('../config/db');
require('dotenv').config();

async function updateVisitsSchema() {
  try {
    console.log('Starting visits table schema update...');
    
    // Check if check_in_method column exists
    const columnCheck = await db.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'visits' AND column_name = 'check_in_method'`
    );
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding check_in_method column to visits table...');
      
      // Add check_in_method column
      await db.query(
        `ALTER TABLE visits 
         ADD COLUMN check_in_method VARCHAR(20) DEFAULT 'web'`
      );
      
      console.log('check_in_method column added successfully.');
    } else {
      console.log('check_in_method column already exists.');
    }
    
    console.log('Visits table schema update completed successfully!');
    
  } catch (error) {
    console.error('Error updating visits schema:', error);
  } finally {
    process.exit();
  }
}

// Run the function
updateVisitsSchema();