require('dotenv').config();
const db = require('../config/db');

async function createPatientsTable() {
  try {
    console.log('Creating patients table...');
    
    // Create patients table
    await db.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender VARCHAR(10) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Patients table created successfully!');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
      CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
    `);
    
    console.log('Patients table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating patients table:', error);
    process.exit(1);
  }
}

createPatientsTable();
