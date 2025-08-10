const axios = require('axios');

// Test the vitals queue endpoint
async function testVitalsQueue() {
  try {
    console.log('Testing vitals queue endpoint...');
    const response = await axios.get('http://localhost:3001/api/ai-triage/vitals-queue');
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

// Test the doctor queue endpoint
async function testDoctorQueue() {
  try {
    console.log('Testing doctor queue endpoint...');
    const response = await axios.get('http://localhost:3001/api/ai-triage/doctor-queue');
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
