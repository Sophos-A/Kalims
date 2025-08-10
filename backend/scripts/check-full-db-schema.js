require('dotenv').config();
const db = require('../config/db');

async function checkFullDatabaseSchema() {
  try {
    console.log('=== Full Database Schema Analysis ===');
    
    // Get all tables in the database
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('All database tables:');
    tables.forEach(table => console.log('- ' + table));
    
    // Check each table for data and references in code
    for (const table of tables) {
      // Check row count
      const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`\n${table}: ${countResult.rows[0].count} rows`);
      
      // Show sample data if table is not empty
      if (countResult.rows[0].count !== '0') {
        try {
          const sampleResult = await db.query(`SELECT * FROM ${table} LIMIT 3`);
          console.log(`Sample data for ${table}:`);
          console.table(sampleResult.rows);
        } catch (err) {
          console.log(`Could not retrieve sample data for ${table}:`, err.message);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking full database schema:', error);
    process.exit(1);
  }
}

checkFullDatabaseSchema();
