require('dotenv').config();
const db = require('../config/db');

async function createVisitsTable() {
  try {
    console.log('Creating visits table...');
    
    // Create visits table
    await db.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        arrival_time TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'triage_completed', 'in_progress', 'completed', 'cancelled', 'no_show')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Visits table created successfully!');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
      CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
      CREATE INDEX IF NOT EXISTS idx_visits_arrival_time ON visits(arrival_time);
    `);
    
    console.log('Visits table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating visits table:', error);
    process.exit(1);
  }
}

createVisitsTable();
