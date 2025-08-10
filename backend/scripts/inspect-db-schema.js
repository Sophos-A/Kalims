require('dotenv').config();
const db = require('../config/db');

async function inspectDatabaseSchema() {
  try {
    console.log('=== Current Database Schema ===');
    
    // Get all tables in the database
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Existing tables:');
    tables.forEach(table => console.log('- ' + table));
    
    // For each existing table, show its columns
    for (const table of tables) {
      console.log(`\n--- ${table.toUpperCase()} ---`);
      
      const schemaResult = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.table(schemaResult.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error inspecting database schema:', error);
    process.exit(1);
  }
}

inspectDatabaseSchema();
