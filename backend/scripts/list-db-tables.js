require('dotenv').config();
const db = require('../config/db');

async function listDatabaseTables() {
  try {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Database tables:');
    result.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error listing database tables:', error);
    process.exit(1);
  }
}

listDatabaseTables();
