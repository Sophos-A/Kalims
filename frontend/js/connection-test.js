/**
 * Connection Test Utility for KALIMS Frontend
 * This script helps diagnose connection issues between frontend and backend
 */

// Self-executing function to avoid global scope pollution
(function() {
  // Get the API base URL from the global scope or use default
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3002/api';
  
  /**
   * Test connection to the backend server
   */
  function testBackendConnection() {
    const healthEndpoint = `${API_BASE_URL}/health`;
    const statusElement = document.getElementById('connectionStatus');
    
    if (statusElement) {
      statusElement.textContent = 'Testing connection...';
      statusElement.className = 'status testing';
    }
    
    console.log(`Testing connection to: ${healthEndpoint}`);
    
    // Use fetch with timeout to test connection
    fetch(healthEndpoint, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    })
    .then(response => {
      if (response.ok) {
        console.log('Backend connection successful!');
        if (statusElement) {
          statusElement.textContent = 'Connected to backend server';
          statusElement.className = 'status success';
        }
        return response.json();
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    })
    .then(data => {
      console.log('Backend health data:', data);
      // Display server info if available
      const serverInfoElement = document.getElementById('serverInfo');
      if (serverInfoElement && data) {
        serverInfoElement.innerHTML = `
          <p><strong>Server:</strong> ${data.service || 'Unknown'}</p>
          <p><strong>Status:</strong> ${data.status || 'Unknown'}</p>
          <p><strong>Database:</strong> ${data.database || 'Unknown'}</p>
          <p><strong>Timestamp:</strong> ${data.timestamp || 'Unknown'}</p>
        `;
        serverInfoElement.style.display = 'block';
      }
    })
    .catch(error => {
      console.error('Backend connection test failed:', error);
      if (statusElement) {
        statusElement.textContent = `Connection failed: ${error.message}`;
        statusElement.className = 'status error';
      }
      
      // Show troubleshooting tips
      const troubleshootElement = document.getElementById('troubleshootTips');
      if (troubleshootElement) {
        troubleshootElement.innerHTML = `
          <h3>Troubleshooting Tips:</h3>
          <ul>
            <li>Ensure the backend server is running at ${API_BASE_URL}</li>
            <li>Check for CORS issues in browser console</li>
            <li>Verify network connectivity</li>
            <li>Check if the backend port (5000) is correct and accessible</li>
            <li>Ensure the backend .env file has ALLOWED_ORIGINS including ${window.location.origin}</li>
          </ul>
        `;
        troubleshootElement.style.display = 'block';
      }
    });
  }
  
  // Add event listener for the test button
  document.addEventListener('DOMContentLoaded', () => {
    const testButton = document.getElementById('testConnection');
    if (testButton) {
      testButton.addEventListener('click', testBackendConnection);
    }
    
    // Auto-run test if the page has a status element
    if (document.getElementById('connectionStatus')) {
      testBackendConnection();
    }
  });
  
  // Make the test function available globally
  window.testBackendConnection = testBackendConnection;
})();