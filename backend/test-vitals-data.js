const axios = require('axios');
require('dotenv').config();

// Test sending vitals data to FastAPI service
async function testVitalsData() {
  try {
    console.log('Testing vitals data submission to FastAPI service...');
    
    const testData = {
      symptoms: "Patient reports headache and dizziness",
      vitals: {
        heartRate: 75,
        respiratoryRate: 15,
        bloodPressure: "120/80",
        oxygenSaturation: 98,
        weight: 70.5
      },
      patientCategory: "new",
      vulnerabilityFactors: ["hypertension", "diabetes"]
    };
    
    console.log('Test data being sent:', testData);
    
    const response = await axios.post(
      `${process.env.AI_ENDPOINT}/triage`,
      testData,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}` 
        },
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || 5000)
      }
    );
    
    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error testing vitals data submission:');
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

testVitalsData();
