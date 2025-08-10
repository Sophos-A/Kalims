const db = require('../config/db');

async function updateSchema() {
  try {
    console.log('Starting database schema update...');
    
    // Create patient_categories table
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        priority_weight FLOAT DEFAULT 0.0,
        color_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created patient_categories table');
    
    // Insert default categories
    await db.query(`
      INSERT INTO patient_categories (name, description, priority_weight, color_code) VALUES
      ('New', 'First-time patients', 0.5, '#4CAF50'),
      ('Follow-up', 'Returning patients for follow-up', 0.3, '#2196F3'),
      ('Post-op', 'Post-operative check-up', 0.6, '#FFC107'),
      ('Referral', 'Patients referred from other departments', 0.7, '#F44336')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Inserted default patient categories');
    
    // Create vulnerability_factors table
    await db.query(`
      CREATE TABLE IF NOT EXISTS vulnerability_factors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        priority_boost FLOAT DEFAULT 0.1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created vulnerability_factors table');
    
    // Insert default vulnerability factors
    await db.query(`
      INSERT INTO vulnerability_factors (name, description, priority_boost) VALUES
      ('elderly', 'Patients over 65 years old', 0.15),
      ('wheelchair', 'Patients requiring wheelchair assistance', 0.2),
      ('pregnant', 'Pregnant patients', 0.25),
      ('urgent_referral', 'Patients with urgent referral notes', 0.3),
      ('critical_condition', 'Patients with critical health conditions', 0.35)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('Inserted default vulnerability factors');
    
    // Alter patients table to add QR code and category
    try {
      await db.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255) UNIQUE;`);
      await db.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES patient_categories(id);`);
      console.log('Altered patients table to add QR code and category');
    } catch (err) {
      console.warn('Warning altering patients table:', err.message);
    }
    
    // Create patient_vulnerabilities junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS patient_vulnerabilities (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        vulnerability_id INTEGER REFERENCES vulnerability_factors(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(patient_id, vulnerability_id)
      );
    `);
    console.log('Created patient_vulnerabilities junction table');
    
    // Alter visits table to add check_in_method and doctor_id
    try {
      await db.query(`ALTER TABLE visits ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(50) DEFAULT 'manual';`);
      await db.query(`ALTER TABLE visits ADD COLUMN IF NOT EXISTS doctor_id INTEGER;`);
      await db.query(`ALTER TABLE visits ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'waiting';`);
      console.log('Altered visits table to add check_in_method and doctor_id');
    } catch (err) {
      console.warn('Warning altering visits table:', err.message);
    }
    
    // Alter queue_positions table to add display_number, estimated_wait_time, and last_status_change
    try {
      await db.query(`ALTER TABLE queue_positions ADD COLUMN IF NOT EXISTS display_number VARCHAR(10);`);
      await db.query(`ALTER TABLE queue_positions ADD COLUMN IF NOT EXISTS estimated_wait_time INTEGER DEFAULT 30;`);
      await db.query(`ALTER TABLE queue_positions ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMP DEFAULT NOW();`);
      console.log('Altered queue_positions table to add display_number, estimated_wait_time, and last_status_change');
    } catch (err) {
      console.warn('Warning altering queue_positions table:', err.message);
    }
    
    // Alter triage_records table to add critical_flags, patient_category, and vulnerability_factors
    try {
      await db.query(`ALTER TABLE triage_records ADD COLUMN IF NOT EXISTS critical_flags JSONB;`);
      await db.query(`ALTER TABLE triage_records ADD COLUMN IF NOT EXISTS patient_category VARCHAR(50);`);
      await db.query(`ALTER TABLE triage_records ADD COLUMN IF NOT EXISTS vulnerability_factors JSONB;`);
      console.log('Altered triage_records table to add critical_flags, patient_category, and vulnerability_factors');
    } catch (err) {
      console.warn('Warning altering triage_records table:', err.message);
    }
    
    // Create attendance_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        notes TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created attendance_logs table');
    
    // Create doctors table
    await db.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        specialty VARCHAR(255),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created doctors table');

    // Create staff table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        role VARCHAR(50) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created staff table');
    
    // Insert sample doctors
    await db.query(`
      INSERT INTO doctors (name, email, specialty) VALUES
      ('Dr. John Smith', 'john.smith@example.com', 'Neurosurgery'),
      ('Dr. Sarah Johnson', 'sarah.johnson@example.com', 'Neurosurgery'),
      ('Dr. Michael Lee', 'michael.lee@example.com', 'Neurosurgery')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('Inserted sample doctors');

    // Insert sample staff
    await db.query(`
      INSERT INTO staff (name, email, role) VALUES
      ('Alice Brown', 'alice.brown@example.com', 'receptionist'),
      ('Robert Davis', 'robert.davis@example.com', 'admin'),
      ('Emily Wilson', 'emily.wilson@example.com', 'nurse')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('Inserted sample staff');
    
    // Create notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER NOT NULL,
        recipient_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        related_id INTEGER,
        related_type VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'normal',
        read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created notifications table');

    // Create indexes for faster queries
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_queue_positions_status ON queue_positions(status);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_queue_positions_priority ON queue_positions(priorityscore);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patientId);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_triage_visit ON triage_records(visitid);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_patient ON attendance_logs(patient_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp);`);
    console.log('Created indexes for faster queries');
    
    console.log('Database schema update completed successfully!');
  } catch (error) {
    console.error('Error updating database schema:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the function
updateSchema();