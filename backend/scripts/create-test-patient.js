/**
 * Script to create a test patient with password for testing login
 */
const db = require('../config/db');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createTestPatient() {
  try {
    console.log('Creating test patient...');
    
    // Generate a test hospital ID
    const hospitalId = 'PT' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Hash a test password
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if test patient already exists
    const existingPatient = await db.query(
      'SELECT id FROM patients WHERE email = $1',
      ['test@example.com']
    );
    
    if (existingPatient.rows.length > 0) {
      // Update existing patient
      console.log('Test patient already exists. Updating password and hospital ID...');
      await db.query(
        `UPDATE patients 
         SET password_hash = $1, hospital_id = $2 
         WHERE email = $3 
         RETURNING id, name, email, hospital_id`,
        [hashedPassword, hospitalId, 'test@example.com']
      );
    } else {
      // Create new test patient
      console.log('Creating new test patient...');
      await db.query(
        `INSERT INTO patients 
         (name, dob, gender, address, phone, email, medicalhistory, emergency_contact, hospital_id, password_hash, createdat, updatedat) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
         RETURNING id, name, email, hospital_id`,
        [
          'Test Patient',
          '1990-01-01',
          'Male',
          '123 Test Street',
          '1234567890',
          'test@example.com',
          'None',
          'Emergency Contact: 1234567890',
          hospitalId,
          hashedPassword
        ]
      );
    }
    
    // Verify the patient was created/updated
    const result = await db.query(
      'SELECT id, name, email, hospital_id FROM patients WHERE email = $1',
      ['test@example.com']
    );
    
    console.log('Test patient created/updated successfully:');
    console.log(result.rows[0]);
    console.log('\nTest credentials:');
    console.log('Email: test@example.com');
    console.log('Hospital ID:', result.rows[0].hospital_id);
    console.log('Password: password123');
    
  } catch (error) {
    console.error('Error creating test patient:', error);
  } finally {
    process.exit();
  }
}

// Run the function
createTestPatient();