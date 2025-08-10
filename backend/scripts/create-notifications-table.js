require('dotenv').config();
const db = require('../config/db');

async function createNotificationsTable() {
  try {
    console.log('Creating notifications table...');
    
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
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
      CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `);
    
    console.log('Notifications table indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating notifications table:', error);
    process.exit(1);
  }
}

createNotificationsTable();
