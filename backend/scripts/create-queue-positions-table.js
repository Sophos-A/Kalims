require('dotenv').config();
const db = require('../config/db');

async function createQueuePositionsTable() {
  try {
    console.log('Creating queue_positions table...');
    
    // Create queue_positions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS queue_positions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
        queue_type VARCHAR(20) NOT NULL CHECK (queue_type IN ('vitals', 'doctor')),
        position INTEGER NOT NULL,
        triage_score INTEGER,
        arrival_time TIMESTAMP DEFAULT NOW(),
        assigned_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Queue positions table created successfully!');
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_positions_patient_id ON queue_positions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_visit_id ON queue_positions(visit_id);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_queue_type ON queue_positions(queue_type);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_position ON queue_positions(position);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_status ON queue_positions(status);
    `);
    
    console.log('Queue positions table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating queue positions table:', error);
    process.exit(1);
  }
}

createQueuePositionsTable();
