/**
 * API Client for KALIMS Frontend
 * Handles all API requests to the backend
 */

// Use the API configuration from api-config.js
// API_ENDPOINTS is already defined in api-config.js

/**
 * Make an API call with proper error handling
 * @param {string} endpoint - API endpoint URL
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} data - Request data (for POST/PUT)
 * @param {boolean} isPatientAuth - Whether this is a patient authentication request
 * @returns {Promise<Object>} Response data
 */
async function callApi(endpoint, method = 'GET', data = null, isPatientAuth = false) {
  try {
    // Get appropriate auth token from localStorage
    const token = isPatientAuth ? localStorage.getItem('patientToken') : localStorage.getItem('authToken');
    
    // Prepare request options
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { body: JSON.stringify(data) }),
      // Add these options to prevent CORS issues
      mode: 'cors',
      credentials: 'include'
    };
    
    console.log(`Making API call to: ${endpoint}`);
    
    // Make the request
    const response = await fetch(endpoint, options);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // Handle non-JSON response
      const text = await response.text();
      result = { message: text };
    }
    
    // Check for error response
    if (!response.ok) {
      throw new Error(result.error || result.message || 'API request failed');
    }
    
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    
    // Provide more specific error messages for common network issues
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network connection error: Unable to connect to the server. Please check your internet connection and ensure the backend server is running.');
    }
    
    throw error;
  }
}

/**
 * API client object with methods for each endpoint
 */
const apiClient = {
  // Auth methods
  auth: {
    login: async (email, password) => {
      return callApi(API_ENDPOINTS.auth.login, 'POST', { email, password });
    },
    register: async (userData) => {
      return callApi(API_ENDPOINTS.auth.register, 'POST', userData);
    },
    verify: async (token) => {
      return callApi(API_ENDPOINTS.auth.verify, 'POST', { token });
    }
  },
  
  // Patient authentication methods
  patientAuth: {
    login: async (identifier, password) => {
      return callApi(API_ENDPOINTS.patientAuth.login, 'POST', { identifier, password }, true);
    },
    register: async (patientData) => {
      return callApi(API_ENDPOINTS.patientAuth.register, 'POST', patientData, true);
    },
    getVitalsQueue: async () => {
      return callApi(API_ENDPOINTS.patientAuth.vitalsQueue, 'GET', null, true);
    },
    getDoctorQueue: async () => {
      return callApi(API_ENDPOINTS.patientAuth.doctorQueue, 'GET', null, true);
    }
  },
  
  // Patient methods
  patients: {
    getAll: async () => {
      return callApi(API_ENDPOINTS.PATIENTS.GET_ALL);
    },
    getById: async (id) => {
      return callApi(API_ENDPOINTS.PATIENTS.GET_BY_ID(id));
    },
    create: async (patientData) => {
      return callApi(API_ENDPOINTS.PATIENTS.CREATE, 'POST', patientData);
    },
    update: async (id, patientData) => {
      return callApi(API_ENDPOINTS.PATIENTS.UPDATE(id), 'PUT', patientData);
    },
    delete: async (id) => {
      return callApi(API_ENDPOINTS.PATIENTS.DELETE(id), 'DELETE');
    }
  },
  
  // Queue methods
  queue: {
    getAll: async () => {
      return callApi(API_ENDPOINTS.QUEUE.GET_ALL);
    },
    updateStatus: async (id, status) => {
      return callApi(API_ENDPOINTS.QUEUE.UPDATE_STATUS(id), 'PUT', { status });
    },
    assignDoctor: async (id, doctorId) => {
      return callApi(API_ENDPOINTS.QUEUE.ASSIGN_DOCTOR(id), 'PUT', { doctorId });
    }
  },
  
  // Triage methods
  triage: {
    submit: async (triageData) => {
      return callApi(API_ENDPOINTS.TRIAGE.SUBMIT, 'POST', triageData);
    },
    getResults: async (visitId) => {
      return callApi(API_ENDPOINTS.TRIAGE.GET_RESULTS(visitId));
    }
  },
  
  // Notification methods
  notifications: {
    getAll: async () => {
      return callApi(API_ENDPOINTS.NOTIFICATIONS.GET_ALL);
    },
    markRead: async (id) => {
      return callApi(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id), 'PUT');
    }
  },
  
  // Report methods
  reports: {
    daily: async (date) => {
      return callApi(`${API_ENDPOINTS.REPORTS.DAILY}?date=${date}`);
    },
    weekly: async (startDate, endDate) => {
      return callApi(`${API_ENDPOINTS.REPORTS.WEEKLY}?startDate=${startDate}&endDate=${endDate}`);
    },
    monthly: async (month, year) => {
      return callApi(`${API_ENDPOINTS.REPORTS.MONTHLY}?month=${month}&year=${year}`);
    },
    custom: async (params) => {
      const queryString = new URLSearchParams(params).toString();
      return callApi(`${API_ENDPOINTS.REPORTS.CUSTOM}?${queryString}`);
    }
  },
  
  // Check-in methods
  checkin: {
    scan: async (qrCode) => {
      return callApi(API_ENDPOINTS.CHECKIN.SCAN, 'POST', { qrCode });
    },
    verify: async (qrCode, symptoms, urgency) => {
      return callApi(API_ENDPOINTS.CHECKIN.VERIFY, 'POST', { qrCode, symptoms, urgency });
    }
  },
  
  // Visit methods
  visits: {
    getAll: async () => {
      return callApi(API_ENDPOINTS.VISITS.GET_ALL);
    },
    getById: async (id) => {
      return callApi(API_ENDPOINTS.VISITS.GET_BY_ID(id));
    },
    getByPatientId: async (patientId) => {
      return callApi(API_ENDPOINTS.VISITS.GET_BY_PATIENT_ID(patientId));
    },
    getActive: async () => {
      return callApi(API_ENDPOINTS.VISITS.GET_ACTIVE);
    },
    getByDateRange: async (startDate, endDate) => {
      return callApi(`${API_ENDPOINTS.VISITS.GET_BY_DATE_RANGE}?startDate=${startDate}&endDate=${endDate}`);
    },
    create: async (visitData) => {
      return callApi(API_ENDPOINTS.VISITS.CREATE, 'POST', visitData);
    },
    update: async (id, visitData) => {
      return callApi(API_ENDPOINTS.VISITS.UPDATE(id), 'PUT', visitData);
    },
    complete: async (id, completionData) => {
      return callApi(API_ENDPOINTS.VISITS.COMPLETE(id), 'PUT', completionData);
    }
  }
};

// Make the API client available globally
window.apiClient = apiClient;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiClient;
}