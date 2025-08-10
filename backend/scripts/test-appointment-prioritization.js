const QueueService = require('../services/queueService');

// Create a test queue with mixed patients and appointments
const testQueue = [
  // Regular patients with various triage scores
  { patientId: 1, visitId: 101, triageScore: 0.92, patientName: 'Regular Patient 1' },
  { patientId: 2, visitId: 102, triageScore: 0.85, patientName: 'Regular Patient 2' },
  { patientId: 3, visitId: 103, triageScore: 0.75, patientName: 'Regular Patient 3' },
  { patientId: 4, visitId: 104, triageScore: 0.65, patientName: 'Regular Patient 4' },
  { patientId: 5, visitId: 105, triageScore: 0.30, patientName: 'Regular Patient 5' },
  // Appointments should be prioritized above patients with score < 0.9
  { patientId: 6, visitId: 106, appointmentId: 1, triageScore: 0.95, patientName: 'Appointment Patient 1' },
  { patientId: 7, visitId: 107, appointmentId: 2, triageScore: 0.95, patientName: 'Appointment Patient 2' }
];

console.log('Before sorting:');
testQueue.forEach((item, index) => {
  console.log(`${index + 1}. ${item.patientName} - Score: ${item.triageScore} ${item.appointmentId ? '(Appointment)' : ''}`);
});

// Apply the sorting logic
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
  console.log(`${index + 1}. ${item.patientName} - Score: ${item.triageScore} ${item.appointmentId ? '(Appointment)' : ''}`);
});

console.log('\nExpected behavior:');
console.log('- Appointments should be prioritized above patients with triage score < 0.9');
console.log('- Regular patients with score >= 0.9 should still be sorted normally');
console.log('- All appointments should be at the top of the queue');
