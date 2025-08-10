require('dotenv').config();
const db = require('../config/db');

async function checkAllTables() {
  try {
    console.log('=== All Database Tables Analysis ===');
    
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
    
    // Check each table for schema and data
    for (const table of tables) {
      console.log(`\n=== ${table.toUpperCase()} TABLE ===`);
      
      // Get table schema
      const schemaResult = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`${table} table columns:`);
      console.table(schemaResult.rows);
      
      // Check row count
      const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`Total ${table} records: ${countResult.rows[0].count}`);
      
      // Show sample data if table is not empty (limit to 3 rows)
      if (countResult.rows[0].count !== '0') {
        try {
          const sampleResult = await db.query(`SELECT * FROM ${table} LIMIT 3`);
          console.log(`Sample ${table} data:`);
          console.table(sampleResult.rows);
        } catch (err) {
          console.log(`Could not retrieve sample data for ${table}:`, err.message);
        }
      } else {
        console.log(`${table} table is empty.`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking all tables:', error);
    process.exit(1);
  }
}

checkAllTables();
