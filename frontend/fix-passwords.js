const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log('🔐 Generating correct bcrypt hashes...\n');
  
  const passwords = [
    { name: 'admin', password: 'admin123' },
    { name: 'michael', password: 'michael123' },
    { name: 'sarah', password: 'nurse123' }
  ];
  
  for (const user of passwords) {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(user.password, salt);
    
    console.log(`${user.name.toUpperCase()} PASSWORD: ${user.password}`);
    console.log(`${user.name.toUpperCase()} HASH: ${hash}`);
    console.log('');
    
    // Verify the hash works
    const isValid = await bcrypt.compare(user.password, hash);
    console.log(`✅ Verification: ${isValid ? 'PASS' : 'FAIL'}\n`);
  }
  
  console.log('📋 SQL UPDATE STATEMENTS:');
  console.log('Run these in your Supabase SQL Editor:\n');
  
  for (const user of passwords) {
    const hash = await bcrypt.hash(user.password, 12);
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${user.name}@medtriage.com';`);
  }
}

generateHashes().catch(console.error);
