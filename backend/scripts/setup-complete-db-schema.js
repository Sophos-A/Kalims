require('dotenv').config();
const db = require('../config/db');

async function setupCompleteDatabaseSchema() {
  try {
    console.log('Setting up complete database schema for KALIMS hospital system...');
    
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
    
    // Create appointments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
        visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
        appointment_datetime TIMESTAMP NOT NULL,
        appointment_type VARCHAR(50) NOT NULL,
        reason TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Appointments table created successfully!');
    
    // Create notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER NOT NULL,
        recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('patient', 'doctor', 'staff')),
        message TEXT NOT NULL,
        related_id INTEGER,
        priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Notifications table created successfully!');
    
    // Create indexes for all tables
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
      CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
      
      CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
      CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(active);
      
      CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
      CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
      CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(active);
      
      CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
      CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
      CREATE INDEX IF NOT EXISTS idx_visits_arrival_time ON visits(arrival_time);
      
      CREATE INDEX IF NOT EXISTS idx_triage_records_visit_id ON triage_records(visit_id);
      CREATE INDEX IF NOT EXISTS idx_triage_records_priority ON triage_records(priority_level);
      CREATE INDEX IF NOT EXISTS idx_triage_records_score ON triage_records(triage_score);
      
      CREATE INDEX IF NOT EXISTS idx_queue_positions_patient_id ON queue_positions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_visit_id ON queue_positions(visit_id);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_queue_type ON queue_positions(queue_type);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_position ON queue_positions(position);
      CREATE INDEX IF NOT EXISTS idx_queue_positions_status ON queue_positions(status);
      
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_datetime);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
      CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `);
    
    console.log('All table indexes created successfully!');
    
    console.log('\n=== Database Schema Setup Complete ===');
    console.log('All required tables and indexes have been created.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database schema:', error);
    process.exit(1);
  }
}

setupCompleteDatabaseSchema();
