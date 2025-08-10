const fs = require('fs');
const path = require('path');

// List of JavaScript database files to delete
const filesToDelete = [
  'create-tables.js',
  'create-notifications-table.js',
  'create-staff-tables.js'
];

// Function to delete files
async function cleanupJsDbFiles() {
  console.log('Starting cleanup of JavaScript database files...');
  
  const scriptsDir = path.join(__dirname);
  
  for (const file of filesToDelete) {
    const filePath = path.join(scriptsDir, file);
    
    try {
      // Check if file exists
      if (fs.existsSync(filePath)) {
        // Delete the file
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted: ${file}`);
      } else {
        console.log(`⚠️ File not found: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting ${file}:`, error.message);
    }
  }
  
  console.log('Cleanup completed!');
}

// Run the function
cleanupJsDbFiles();