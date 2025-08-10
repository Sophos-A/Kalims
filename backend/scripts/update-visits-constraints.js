/**
 * Script to update the visits table constraints
 */
const db = require('../config/db');
require('dotenv').config();

async function updateVisitsConstraints() {
  try {
    console.log('Starting visits table constraints update...');
    
    // Check current constraint
    const constraintCheck = await db.query(
      `SELECT conname, pg_get_constraintdef(oid) 
       FROM pg_constraint 
       WHERE conrelid = 'visits'::regclass AND conname = 'visits_status_check'`
    );
    
    if (constraintCheck.rows.length > 0) {
      console.log('Current constraint:', constraintCheck.rows[0].pg_get_constraintdef);
      
      // First update any rows with invalid status
      console.log('Updating any rows with invalid status...');
      await db.query(
        `UPDATE visits 
         SET status = 'registered' 
         WHERE status NOT IN ('registered', 'triaged', 'in-progress', 'completed', 'cancelled')`
      );
      
      // Drop the existing constraint
      console.log('Dropping existing constraint...');
      await db.query('ALTER TABLE visits DROP CONSTRAINT visits_status_check');
      
      // Add new constraint that includes 'registered'
      console.log('Adding new constraint with registered status...');
      await db.query(
        `ALTER TABLE visits ADD CONSTRAINT visits_status_check 
         CHECK (status IN ('registered', 'triaged', 'in-progress', 'completed', 'cancelled', 'waiting'))`
      );
      
      console.log('Constraint updated successfully.');
    } else {
      console.log('No status check constraint found. Adding new constraint...');
      await db.query(
        `ALTER TABLE visits ADD CONSTRAINT visits_status_check 
         CHECK (status IN ('registered', 'triaged', 'in-progress', 'completed', 'cancelled', 'waiting'))`
      );
      console.log('New constraint added successfully.');
    }
    
    console.log('Visits table constraints update completed successfully!');
    
  } catch (error) {
    console.error('Error updating visits constraints:', error);
  } finally {
    process.exit();
  }
}

// Run the function
updateVisitsConstraints();