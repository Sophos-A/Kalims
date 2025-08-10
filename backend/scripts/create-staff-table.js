require('dotenv').config();
const db = require('../config/db');

async function createStaffTable() {
  try {
    console.log('Creating staff table...');
    
    // Create staff table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'receptionist', 'nurse', 'doctor')),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Staff table created successfully!');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
      CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
      CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(active);
    `);
    
    console.log('Staff table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating staff table:', error);
    process.exit(1);
  }
}

createStaffTable();
