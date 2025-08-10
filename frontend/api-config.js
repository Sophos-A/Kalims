// API Configuration for KBTH Triage System

// Base API URL - adjust this based on your deployment environment
const API_BASE = "http://localhost:3001/api";

// Log the API base URL for debugging
console.log('API Base URL:', API_BASE);

// API Endpoints
const API_ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        LOGIN: `${API_BASE}/auth/login`,
        REGISTER: `${API_BASE}/auth/register`,
        VERIFY: `${API_BASE}/auth/verify`
    },
    
    // Patient endpoints
    PATIENTS: {
        GET_ALL: `${API_BASE}/patients`,
        GET_BY_ID: (id) => `${API_BASE}/patients/${id}`,
        CREATE: `${API_BASE}/patients`,
        UPDATE: (id) => `${API_BASE}/patients/${id}`,
        DELETE: (id) => `${API_BASE}/patients/${id}`
    },
    
    // Queue endpoints
    QUEUE: {
        GET_ALL: `${API_BASE}/queue`,
        UPDATE: (id) => `${API_BASE}/queue/${id}`,
        GET_STATUS: (id) => `${API_BASE}/queue/status/${id}`,
        UPDATE: (id) => `${API_BASE}/queue/${id}`
    },
    
    // AI Triage endpoints
    AI_TRIAGE: {
        PROCESS: `${API_BASE}/ai-triage/process`,
        VITALS_QUEUE: `${API_BASE}/ai-triage/vitals-queue`,
        DOCTOR_QUEUE: `${API_BASE}/ai-triage/doctor-queue`
    },
    
    // Notification endpoints
    NOTIFICATIONS: {
        GET_ALL: `${API_BASE}/notifications`,
        MARK_READ: (id) => `${API_BASE}/notifications/${id}/read`
    },
    
    // Report endpoints
    REPORTS: {
        DAILY: `${API_BASE}/reports/daily`,
        WEEKLY: `${API_BASE}/reports/weekly`,
        MONTHLY: `${API_BASE}/reports/monthly`,
        CUSTOM: `${API_BASE}/reports/custom`
    },
    
    // Check-in endpoints
    CHECKIN: {
        PATIENT_LOGIN: `${API_BASE}/checkin/patient-login`
    }
};

// Helper function to make API calls with proper authentication
async function callApi(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('authToken');
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...(data && { body: JSON.stringify(data) })
    };
    
    try {
        const response = await fetch(endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}