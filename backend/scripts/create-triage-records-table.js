require('dotenv').config();
const db = require('../config/db');

async function createTriageRecordsTable() {
  try {
    console.log('Creating triage_records table...');
    
    // Create triage_records table
    await db.query(`
      CREATE TABLE IF NOT EXISTS triage_records (
        id SERIAL PRIMARY KEY,
        visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
        heart_rate INTEGER,
        respiratory_rate INTEGER,
        blood_pressure_sys INTEGER,
        blood_pressure_dia INTEGER,
        oxygen_saturation INTEGER,
        weight DECIMAL(5,2),
        notes TEXT,
        triage_score INTEGER,
        priority_level VARCHAR(20) CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Triage records table created successfully!');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_triage_records_visit_id ON triage_records(visit_id);
      CREATE INDEX IF NOT EXISTS idx_triage_records_priority ON triage_records(priority_level);
      CREATE INDEX IF NOT EXISTS idx_triage_records_score ON triage_records(triage_score);
    `);
    
    console.log('Triage records table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating triage records table:', error);
    process.exit(1);
  }
}

createTriageRecordsTable();
