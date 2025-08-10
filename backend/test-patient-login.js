const axios = require('axios');
require('dotenv').config();

// Test patient login check-in endpoint
async function testPatientLoginCheckin() {
  try {
    console.log('Testing patient login check-in endpoint...');
    
    const testData = {
      patientId: 'test-patient-123',
      patientEmail: 'test@example.com',
      checkInMethod: 'web'
    };
    
    console.log('Test data being sent:', testData);
    
    const response = await axios.post(
      'http://localhost:3001/api/checkin/patient-login',
      testData,
      {
        headers: { 
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error testing patient login check-in:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.request) {
      console.error('Request details:', {
        method: error.config?.method,
        url: error.config?.url,
        data: error.config?.data
      });
    }
  }
}

testPatientLoginCheckin();
