/**
 * Script to update the patients table schema to support authentication
 */
const db = require('../config/db');
require('dotenv').config();

async function updatePatientSchema() {
  try {
    console.log('Starting patient table schema update...');
    
    // Check if hospital_id column exists
    const hospitalIdCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'hospital_id';
    `);
    
    if (hospitalIdCheck.rows.length === 0) {
      console.log('Adding hospital_id column to patients table...');
      await db.query(`
        ALTER TABLE patients 
        ADD COLUMN hospital_id VARCHAR(10) UNIQUE;
      `);
      console.log('hospital_id column added successfully.');
    } else {
      console.log('hospital_id column already exists.');
    }
    
    // Check if password_hash column exists
    const passwordCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'password_hash';
    `);
    
    if (passwordCheck.rows.length === 0) {
      console.log('Adding password_hash column to patients table...');
      await db.query(`
        ALTER TABLE patients 
        ADD COLUMN password_hash VARCHAR(100);
      `);
      console.log('password_hash column added successfully.');
    } else {
      console.log('password_hash column already exists.');
    }
    
    // Check if emergency_contact column exists
    const emergencyContactCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'emergency_contact';
    `);
    
    if (emergencyContactCheck.rows.length === 0) {
      console.log('Adding emergency_contact column to patients table...');
      await db.query(`
        ALTER TABLE patients 
        ADD COLUMN emergency_contact VARCHAR(100);
      `);
      console.log('emergency_contact column added successfully.');
    } else {
      console.log('emergency_contact column already exists.');
    }
    
    console.log('Patient table schema update completed successfully!');
  } catch (error) {
    console.error('Error updating patient schema:', error);
  } finally {
    process.exit();
  }
}

// Run the update function
updatePatientSchema();