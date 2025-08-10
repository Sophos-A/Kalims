// Test script to verify appointment prioritization logic
console.log('Testing appointment prioritization logic...\n');

// Test queue with mixed patients and appointments
const testQueue = [
  // Regular patients with various triage scores
  { patientId: 1, visitId: 101, triageScore: 0.92, patientName: 'Regular Patient 1 (Score: 0.92)' },
  { patientId: 2, visitId: 102, triageScore: 0.85, patientName: 'Regular Patient 2 (Score: 0.85)' },
  { patientId: 3, visitId: 103, triageScore: 0.75, patientName: 'Regular Patient 3 (Score: 0.75)' },
  { patientId: 4, visitId: 104, triageScore: 0.65, patientName: 'Regular Patient 4 (Score: 0.65)' },
  { patientId: 5, visitId: 105, triageScore: 0.30, patientName: 'Regular Patient 5 (Score: 0.30)' },
  // Appointments should be prioritized above patients with score < 0.9
  { patientId: 6, visitId: 106, appointmentId: 1, triageScore: 0.95, patientName: 'Appointment Patient 1 (Score: 0.95)' },
  { patientId: 7, visitId: 107, appointmentId: 2, triageScore: 0.95, patientName: 'Appointment Patient 2 (Score: 0.95)' }
];

console.log('Before sorting:');
testQueue.forEach((item, index) => {
  console.log(`${index + 1}. ${item.patientName} ${item.appointmentId ? '(Appointment)' : ''}`);
});

// Apply the sorting logic that was implemented
const sortedQueue = [...testQueue].sort((a, b) => {
  // Check if either patient is an appointment
  const aIsAppointment = a.hasOwnProperty('appointmentId');
  const bIsAppointment = b.hasOwnProperty('appointmentId');
  
  // If both are appointments or both are regular patients, sort by triage score
  if ((aIsAppointment && bIsAppointment) || (!aIsAppointment && !bIsAppointment)) {
    return b.triageScore - a.triageScore;
  }
  
  // If only A is an appointment, A comes first if B's score is < 0.9
  if (aIsAppointment && !bIsAppointment) {
    return b.triageScore < 0.9 ? -1 : 1;
  }
  
  // If only B is an appointment, B comes first if A's score is < 0.9
  if (bIsAppointment && !aIsAppointment) {
    return a.triageScore < 0.9 ? 1 : -1;
  }
  
  // Default sorting by triage score
  return b.triageScore - a.triageScore;
});

console.log('\nAfter sorting:');
sortedQueue.forEach((item, index) => {
  console.log(`${index + 1}. ${item.patientName} ${item.appointmentId ? '(Appointment)' : ''}`);
});

// Verify the expected behavior
console.log('\nExpected behavior verification:');
const appointmentPositions = [];
const regularPositions = [];

sortedQueue.forEach((item, index) => {
  if (item.appointmentId) {
    appointmentPositions.push(index + 1);
  } else {
    regularPositions.push({ position: index + 1, score: item.triageScore, name: item.patientName });
  }
});

console.log('- Appointments are at positions:', appointmentPositions);
console.log('- Regular patients with score >= 0.9 should be at the top of the queue');
console.log('- Regular patients with score < 0.9 should be after appointments');

// Check if appointments are properly prioritized
const firstRegularPatient = regularPositions.find(p => p.score >= 0.9);
const appointmentsBeforeAllLowScorePatients = appointmentPositions.every(pos => 
  regularPositions.filter(p => p.score < 0.9).every(rp => pos < rp.position)
);

console.log('\nTest Results:');
console.log('- Appointments properly prioritized:', appointmentsBeforeAllLowScorePatients);
console.log('- High-score regular patients positioned correctly:', firstRegularPatient ? firstRegularPatient.position >= Math.max(...appointmentPositions) : true);
