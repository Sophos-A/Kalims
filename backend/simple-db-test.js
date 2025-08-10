const db = require('./config/db');

async function testBasicQueries() {
  try {
    console.log('Testing basic database queries...');
    
    // Test 1: Check if patients table exists and has basic structure
    console.log('\n1. Testing patients table...');
    const patientsTest = await db.query('SELECT * FROM patients LIMIT 1');
    console.log('Patients table accessible:', patientsTest.rows.length >= 0 ? 'YES' : 'NO');
    
    // Test 2: Check if visits table exists and has basic structure  
    console.log('\n2. Testing visits table...');
    const visitsTest = await db.query('SELECT * FROM visits LIMIT 1');
    console.log('Visits table accessible:', visitsTest.rows.length >= 0 ? 'YES' : 'NO');
    
    // Test 3: Check if queue_positions table exists
    console.log('\n3. Testing queue_positions table...');
    const queueTest = await db.query('SELECT * FROM queue_positions LIMIT 1');
    console.log('Queue_positions table accessible:', queueTest.rows.length >= 0 ? 'YES' : 'NO');
    
    // Test 4: Try to insert a simple patient record
    console.log('\n4. Testing patient insertion...');
    const testPatientId = 'simple-test-' + Date.now();
    
    try {
      const insertResult = await db.query(
        `INSERT INTO patients (id, name, email) VALUES ($1, $2, $3) RETURNING id`,
        [testPatientId, 'Test Patient', 'test@example.com']
      );
      console.log('Patient insertion successful:', insertResult.rows[0].id);
      
      // Clean up
      await db.query('DELETE FROM patients WHERE id = $1', [testPatientId]);
      console.log('Test patient cleaned up');
      
    } catch (insertError) {
      console.error('Patient insertion failed:', insertError.message);
    }
    
  } catch (error) {
    console.error('Database test error:', error.message);
  } finally {
    process.exit();
  }
}

testBasicQueries();
