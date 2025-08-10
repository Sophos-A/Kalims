const db = require('./config/db');

async function fixDatabaseSchema() {
  try {
    console.log('Fixing database schema for patient check-in...');
    
    // First, let's check what tables exist
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\nExisting tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check if patients table has the required columns
    console.log('\nChecking patients table structure...');
    try {
      const patientsStructure = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        ORDER BY ordinal_position
      `);
      
      console.log('Patients table columns:');
      patientsStructure.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Ensure patients table has required columns
      const requiredPatientColumns = [
        { name: 'id', type: 'TEXT PRIMARY KEY' },
        { name: 'name', type: 'TEXT' },
        { name: 'email', type: 'TEXT' },
        { name: 'dob', type: 'DATE' },
        { name: 'gender', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' }
      ];
      
      for (const col of requiredPatientColumns) {
        try {
          await db.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
          console.log(`✓ Ensured column: patients.${col.name}`);
        } catch (err) {
          console.log(`- Column patients.${col.name} already exists or error: ${err.message}`);
        }
      }
      
    } catch (err) {
      console.log('Patients table does not exist, creating...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          dob DATE,
          gender TEXT,
          phone TEXT,
          address TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ Created patients table');
    }
    
    // Check/create visits table
    console.log('\nChecking visits table structure...');
    try {
      const visitsStructure = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'visits' 
        ORDER BY ordinal_position
      `);
      
      console.log('Visits table columns:');
      visitsStructure.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Ensure visits table has required columns
      const requiredVisitColumns = [
        { name: 'id', type: 'SERIAL PRIMARY KEY' },
        { name: 'patient_id', type: 'TEXT REFERENCES patients(id)' },
        { name: 'arrival_time', type: 'TIMESTAMP DEFAULT NOW()' },
        { name: 'status', type: 'TEXT DEFAULT \'waiting\'' }
      ];
      
      for (const col of requiredVisitColumns) {
        try {
          if (col.name !== 'id') { // Skip primary key
            await db.query(`ALTER TABLE visits ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            console.log(`✓ Ensured column: visits.${col.name}`);
          }
        } catch (err) {
          console.log(`- Column visits.${col.name} already exists or error: ${err.message}`);
        }
      }
      
    } catch (err) {
      console.log('Visits table does not exist, creating...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS visits (
          id SERIAL PRIMARY KEY,
          patient_id TEXT REFERENCES patients(id),
          arrival_time TIMESTAMP DEFAULT NOW(),
          status TEXT DEFAULT 'waiting'
        )
      `);
      console.log('✓ Created visits table');
    }
    
    // Check/create queue_positions table
    console.log('\nChecking queue_positions table structure...');
    try {
      const queueStructure = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'queue_positions' 
        ORDER BY ordinal_position
      `);
      
      console.log('Queue_positions table columns:');
      queueStructure.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Ensure queue_positions table has required columns
      const requiredQueueColumns = [
        { name: 'id', type: 'SERIAL PRIMARY KEY' },
        { name: 'patient_id', type: 'TEXT REFERENCES patients(id)' },
        { name: 'visit_id', type: 'INTEGER REFERENCES visits(id)' },
        { name: 'priority_score', type: 'DECIMAL DEFAULT 0.0' },
        { name: 'status', type: 'TEXT DEFAULT \'waiting\'' },
        { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' }
      ];
      
      for (const col of requiredQueueColumns) {
        try {
          if (col.name !== 'id') { // Skip primary key
            await db.query(`ALTER TABLE queue_positions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
            console.log(`✓ Ensured column: queue_positions.${col.name}`);
          }
        } catch (err) {
          console.log(`- Column queue_positions.${col.name} already exists or error: ${err.message}`);
        }
      }
      
    } catch (err) {
      console.log('Queue_positions table does not exist, creating...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS queue_positions (
          id SERIAL PRIMARY KEY,
          patient_id TEXT REFERENCES patients(id),
          visit_id INTEGER REFERENCES visits(id),
          priority_score DECIMAL DEFAULT 0.0,
          status TEXT DEFAULT 'waiting',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ Created queue_positions table');
    }
    
    console.log('\n✅ Database schema fix completed!');
    
  } catch (error) {
    console.error('Error fixing database schema:', error);
  } finally {
    process.exit();
  }
}

fixDatabaseSchema();
