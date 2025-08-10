require('dotenv').config();
const db = require('../config/db');

async function createDoctorsTable() {
  try {
    console.log('Creating doctors table...');
    
    // Create doctors table
    await db.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        specialty VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Doctors table created successfully!');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
      CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(active);
    `);
    
    console.log('Doctors table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating doctors table:', error);
    process.exit(1);
  }
}

createDoctorsTable();
