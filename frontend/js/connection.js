/**
 * Connection utility for KALIMS Frontend
 * Handles the connection between frontend and backend
 */

// Import API client if available
const apiClient = window.apiClient || {};

/**
 * Connection utility object
 */
const connection = {
  /**
   * Initialize the connection
   */
  init: function() {
    // Check if API endpoints are loaded
    if (!window.API_ENDPOINTS) {
      console.error('API endpoints not loaded. Make sure api-config.js is included before this file.');
      return false;
    }
    
    // Check if API client is loaded
    if (!window.apiClient) {
      console.error('API client not loaded. Make sure api-client.js is included before this file.');
      return false;
    }
    
    console.log('Connection initialized successfully');
    return true;
  },
  
  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: function() {
    return !!localStorage.getItem('authToken');
  },
  
  /**
   * Redirect to login page if not authenticated
   */
  requireAuth: function() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
    }
  },
  
  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @param {Function} callback - Optional callback function
   */
  handleError: function(error, callback) {
    console.error('API Error:', error);
    
    // Check for authentication errors
    if (error.message && (error.message.includes('unauthorized') || error.message.includes('Unauthorized'))) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login.html?error=session_expired';
      return;
    }
    
    // Check for network connectivity errors
    if (error.message && error.message.includes('Failed to fetch')) {
      console.error('Network connectivity issue detected');
      // Try to check if the backend is reachable
      this.checkBackendConnection();
    }
    
    // Display error message
    const errorElement = document.getElementById('errorMessage');
    if (errorElement) {
      errorElement.textContent = error.message || 'An error occurred';
      errorElement.style.display = 'block';
    } else {
      alert(error.message || 'An error occurred');
    }
    
    // Call callback if provided
    if (typeof callback === 'function') {
      callback(error);
    }
  },
  
  /**
   * Check if backend server is reachable
   */
  checkBackendConnection: function() {
    const healthEndpoint = `${API_BASE_URL}/health`;
    console.log('Checking backend connection at:', healthEndpoint);
    
    // Use a simple fetch with timeout to check connectivity
    fetch(healthEndpoint, { 
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      timeout: 5000 // 5 second timeout
    })
    .then(response => {
      if (response.ok) {
        console.log('Backend server is reachable');
        return response.json();
      } else {
        console.error('Backend server returned an error:', response.status);
        throw new Error(`Backend server error: ${response.status}`);
      }
    })
    .then(data => {
      console.log('Backend health check:', data);
    })
    .catch(error => {
      console.error('Backend connectivity check failed:', error);
      // Display a more user-friendly message
      const errorElement = document.getElementById('errorMessage');
      if (errorElement) {
        errorElement.textContent = 'Unable to connect to the server. Please check your internet connection and ensure the backend server is running.';
        errorElement.style.display = 'block';
      }
    });
  },
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess: function(message) {
    const successElement = document.getElementById('successMessage');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 3000);
    }
  },
  
  /**
   * Format date for display
   * @param {string} dateString - Date string
   * @returns {string} Formatted date
   */
  formatDate: function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  /**
   * Get current user from localStorage
   * @returns {Object|null} User object or null
   */
  getCurrentUser: function() {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  }
};

// Make the connection utility available globally
window.connection = connection;

// Initialize connection when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  connection.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = connection;
}