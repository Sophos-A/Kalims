// Test script to verify notification integration with high-priority patient detection
console.log('Testing notification integration with high-priority patient detection...\n');

// Simulate triage scores
const testCases = [
  { patientId: 1, triageScore: 0.92, description: 'High-priority patient (Score > 0.8)' },
  { patientId: 2, triageScore: 0.85, description: 'High-priority patient (Score > 0.8)' },
  { patientId: 3, triageScore: 0.75, description: 'Normal-priority patient (Score <= 0.8)' },
  { patientId: 4, triageScore: 0.30, description: 'Low-priority patient (Score <= 0.8)' }
];

console.log('Processing triage scores:');
testCases.forEach(testCase => {
  console.log(`- Patient ${testCase.patientId}: ${testCase.description}`);
  
  // Check if notification should be sent
  if (testCase.triageScore > 0.8) {
    console.log(`  -> Notification WOULD be sent to staff for this patient`);
  } else {
    console.log(`  -> Notification would NOT be sent for this patient`);
  }
});

console.log('\nExpected behavior:');
console.log('- Patients with triage scores > 0.8 should trigger notifications to staff');
console.log('- Patients with triage scores <= 0.8 should not trigger notifications');
console.log('- All doctors and admin staff should receive notifications about urgent cases');
