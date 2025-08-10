const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate a test JWT token for staff
const testToken = jwt.sign(
  { 
    id: 1, 
    email: 'test@kbth.gov.gh', 
    name: 'Test Staff', 
    role: 'doctor',
    type: 'staff'
  }, 
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Generated test token:', testToken);

// Test the vitals queue endpoint with authentication
async function testVitalsQueue() {
  try {
    console.log('Testing vitals queue endpoint with authentication...');
    const response = await axios.get('http://localhost:3001/api/ai-triage/vitals-queue', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('Vitals queue response:', response.data);
  } catch (error) {
    console.error('Error testing vitals queue:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.request) {
      console.error('Request:', error.request);
    }
  }
}

// Test the doctor queue endpoint with authentication
async function testDoctorQueue() {
  try {
    console.log('Testing doctor queue endpoint with authentication...');
    const response = await axios.get('http://localhost:3001/api/ai-triage/doctor-queue', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('Doctor queue response:', response.data);
  } catch (error) {
    console.error('Error testing doctor queue:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.request) {
      console.error('Request:', error.request);
    }
  }
}

// Run tests
async function runTests() {
  await testVitalsQueue();
  await testDoctorQueue();
}

runTests();
