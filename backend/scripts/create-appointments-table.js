const db = require('../config/db');

async function createAppointmentsTable() {
  try {
    console.log('Creating appointments table...');
    
    // Create appointments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
        visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
        appointment_date TIMESTAMP NOT NULL,
        appointment_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes for faster queries
    await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);`);
    
    console.log('Appointments table created successfully!');
    
    // Add a column to visits table to link to appointments if it doesn't exist
    try {
      await db.query(`ALTER TABLE visits ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id);`);
      console.log('Added appointment_id column to visits table');
    } catch (err) {
      console.warn('Warning adding appointment_id column to visits table:', err.message);
    }
    
  } catch (error) {
    console.error('Error creating appointments table:', error);
  } finally {
    process.exit(0);
  }
}

// Run the function
createAppointmentsTable();
