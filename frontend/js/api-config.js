/**
 * API Configuration for KALIMS Frontend
 * Defines all API endpoints used by the frontend
 */

// Base API URL - Change this based on environment
// Use environment variable if available, otherwise fallback to default
const API_BASE_URL = 'http://localhost:3002/api';

// Log the API base URL for debugging
console.log('API Base URL:', API_BASE_URL);

// API Endpoints
const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    logout: `${API_BASE_URL}/auth/logout`,
    profile: `${API_BASE_URL}/auth/profile`
  },
  
  // Patient authentication endpoints
  patientAuth: {
    login: `${API_BASE_URL}/patient-auth/login`,
    register: `${API_BASE_URL}/patient-auth/register`,
    vitalsQueue: `${API_BASE_URL}/ai-triage/vitals-queue`,
    doctorQueue: `${API_BASE_URL}/ai-triage/doctor-queue`
  },
  
  // Patient endpoints
  patients: {
    getAll: `${API_BASE_URL}/patients`,
    getById: (id) => `${API_BASE_URL}/patients/${id}`,
    create: `${API_BASE_URL}/patients`,
    update: (id) => `${API_BASE_URL}/patients/${id}`,
    delete: (id) => `${API_BASE_URL}/patients/${id}`,
    generateQR: (id) => `${API_BASE_URL}/patients/${id}/qr`
  },
  
  // Queue endpoints
  queue: {
    getAll: `${API_BASE_URL}/queue`,
    getById: (id) => `${API_BASE_URL}/queue/${id}`,
    updateStatus: (id) => `${API_BASE_URL}/queue/${id}/status`,
    assignDoctor: (id) => `${API_BASE_URL}/queue/${id}/assign`
  },
  
  // Triage endpoints
  triage: {
    submit: `${API_BASE_URL}/triage`,
    getByVisitId: (visitId) => `${API_BASE_URL}/triage/visit/${visitId}`,
    update: (id) => `${API_BASE_URL}/triage/${id}`
  },
  
  // Visit endpoints
  visits: {
    getAll: `${API_BASE_URL}/visits`,
    getById: (id) => `${API_BASE_URL}/visits/${id}`,
    getByPatientId: (patientId) => `${API_BASE_URL}/visits/patient/${patientId}`,
    getActive: `${API_BASE_URL}/visits/active`,
    getByDateRange: `${API_BASE_URL}/visits/date-range`,
    create: `${API_BASE_URL}/visits`,
    update: (id) => `${API_BASE_URL}/visits/${id}`,
    complete: (id) => `${API_BASE_URL}/visits/${id}/complete`
  },
  
  // Notification endpoints
  notifications: {
    getAll: `${API_BASE_URL}/notifications`,
    markAsRead: (id) => `${API_BASE_URL}/notifications/${id}/read`
  },
  
  // Report endpoints
  reports: {
    daily: `${API_BASE_URL}/reports/daily`,
    weekly: `${API_BASE_URL}/reports/weekly`,
    monthly: `${API_BASE_URL}/reports/monthly`,
    custom: `${API_BASE_URL}/reports/custom`
  },
  
  // Check-in endpoints
  checkin: {
    scan: (qrCode) => `${API_BASE_URL}/checkin/${qrCode}`,
    verify: (qrCode) => `${API_BASE_URL}/checkin/${qrCode}`,
    scanEndpoint: `${API_BASE_URL}/checkin/scan`,
    verifyEndpoint: `${API_BASE_URL}/checkin/verify`
  }
};

// Make API endpoints available globally
window.API_BASE_URL = API_BASE_URL;
window.API_ENDPOINTS = API_ENDPOINTS;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_BASE_URL,
    API_ENDPOINTS
  };
}