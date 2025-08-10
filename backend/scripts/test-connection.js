const db = require('../config/db');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    
    // Check if tables exist
    const tables = [
      'patients',
      'visits',
      'queue_positions',
      'triage_records',
      'patient_categories',
      'vulnerability_factors',
      'patient_vulnerabilities',
      'attendance_logs',
      'doctors',
      'staff',
      'notifications'
    ];
    
    console.log('\nChecking database tables:');
    for (const table of tables) {
      try {
        const result = await db.query(
          `SELECT EXISTS (
             SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = $1
           ) as exists`,
          [table]
        );
        
        if (result.rows[0].exists) {
          console.log(`✅ Table '${table}' exists`);
        } else {
          console.log(`❌ Table '${table}' does not exist`);
        }
      } catch (err) {
        console.log(`❌ Error checking table '${table}':`, err.message);
      }
    }
    
    console.log('\nDatabase check completed!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the function
testConnection();