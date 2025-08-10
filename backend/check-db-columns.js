const db = require('./config/db');

async function checkDatabaseColumns() {
  try {
    console.log('Checking database table columns...');
    
    // Check visits table columns
    const visitsColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'visits' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nVisits table columns:');
    visitsColumns.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Check patients table columns
    const patientsColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nPatients table columns:');
    patientsColumns.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    // Check queue_positions table columns
    const queueColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'queue_positions' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nQueue_positions table columns:');
    queueColumns.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Error checking database columns:', error);
  } finally {
    process.exit();
  }
}

checkDatabaseColumns();
