/**
 * Form Handler utility for KALIMS Frontend
 * Handles form submissions and validation
 */

// Import connection utility if available
const connection = window.connection || {};
const apiClient = window.apiClient || {};

/**
 * Form Handler utility object
 */
const formHandler = {
  /**
   * Initialize form handlers
   */
  init: function() {
    this.setupLoginForm();
    this.setupPatientRegistrationForm();
    this.setupTriageForm();
    this.setupQRScanForm();
  },
  
  /**
   * Setup login form
   */
  setupLoginForm: function() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        const result = await apiClient.auth.login(email, password);
        
        // Store auth token and user data
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Redirect based on user role
        if (result.user.role === 'admin') {
          window.location.href = '/staff_management.html';
        } else if (result.user.role === 'doctor' || result.user.role === 'nurse') {
          window.location.href = '/staff.html';
        } else {
          window.location.href = '/logedin.html';
        }
      } catch (error) {
        connection.handleError(error);
      }
    });
  },
  
  /**
   * Setup patient registration form
   */
  setupPatientRegistrationForm: function() {
    const patientForm = document.getElementById('patientForm');
    if (!patientForm) return;
    
    patientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const patientData = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone')?.value || '',
        email: document.getElementById('email')?.value || '',
        address: document.getElementById('address')?.value || '',
        category_id: document.getElementById('category')?.value || 1
      };
      
      try {
        const result = await apiClient.patients.create(patientData);
        
        // Show success message
        connection.showSuccess('Patient registered successfully!');
        
        // Redirect to success page with patient ID
        window.location.href = `/registration_success.html?id=${result.patient.id}`;
      } catch (error) {
        connection.handleError(error);
      }
    });
  },
  
  /**
   * Setup triage form
   */
  setupTriageForm: function() {
    const triageForm = document.getElementById('triageForm');
    if (!triageForm) return;
    
    triageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const visitId = document.getElementById('visitId').value;
      const symptoms = document.getElementById('symptoms').value;
      const urgencyLevel = document.getElementById('urgencyLevel').value;
      const vitalSigns = document.getElementById('vitalSigns')?.value || '';
      const notes = document.getElementById('notes')?.value || '';
      
      try {
        const result = await apiClient.triage.submit({
          visitId,
          symptoms,
          urgencyLevel,
          vitalSigns,
          notes
        });
        
        // Show success message
        connection.showSuccess('Triage submitted successfully!');
        
        // Redirect to queue page
        window.location.href = '/queue.html';
      } catch (error) {
        connection.handleError(error);
      }
    });
  },
  
  /**
   * Setup QR code scan form
   */
  setupQRScanForm: function() {
    const qrForm = document.getElementById('qrScanForm');
    if (!qrForm) return;
    
    qrForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const qrCode = document.getElementById('qrCode').value;
      
      try {
        const result = await apiClient.checkin.scan(qrCode);
        
        // Display patient information
        const patientInfo = document.getElementById('patientInfo');
        if (patientInfo) {
          patientInfo.innerHTML = `
            <h3>Patient Information</h3>
            <p><strong>Name:</strong> ${result.patient.name}</p>
            <p><strong>DOB:</strong> ${connection.formatDate(result.patient.dob)}</p>
            <p><strong>Gender:</strong> ${result.patient.gender}</p>
            <p><strong>Category:</strong> ${result.patient.category_name}</p>
          `;
          patientInfo.style.display = 'block';
        }
        
        // Show check-in form
        const checkinForm = document.getElementById('checkinForm');
        if (checkinForm) {
          document.getElementById('hiddenQrCode').value = qrCode;
          checkinForm.style.display = 'block';
        }
      } catch (error) {
        connection.handleError(error);
      }
    });
    
    // Setup check-in form submission
    const checkinForm = document.getElementById('checkinForm');
    if (checkinForm) {
      checkinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const qrCode = document.getElementById('hiddenQrCode').value;
        const symptoms = document.getElementById('symptoms').value;
        const urgency = document.getElementById('urgency').value;
        
        try {
          const result = await apiClient.checkin.verify(qrCode, symptoms, urgency);
          
          // Show success message
          connection.showSuccess('Patient checked in successfully!');
          
          // Display queue information
          const queueInfo = document.getElementById('queueInfo');
          if (queueInfo) {
            queueInfo.innerHTML = `
              <h3>Queue Information</h3>
              <p><strong>Queue Position:</strong> ${result.queuePosition}</p>
              <p><strong>Status:</strong> ${result.status}</p>
            `;
            queueInfo.style.display = 'block';
          }
          
          // Hide forms
          qrForm.style.display = 'none';
          checkinForm.style.display = 'none';
        } catch (error) {
          connection.handleError(error);
        }
      });
    }
  },
  
  /**
   * Validate form inputs
   * @param {HTMLFormElement} form - Form element
   * @returns {boolean} Validation result
   */
  validateForm: function(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (input.hasAttribute('required') && !input.value.trim()) {
        isValid = false;
        input.classList.add('invalid');
        
        // Add error message
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error-message';
        errorSpan.textContent = 'This field is required';
        
        // Remove existing error messages
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
          input.parentNode.removeChild(existingError);
        }
        
        input.parentNode.appendChild(errorSpan);
      } else {
        input.classList.remove('invalid');
        
        // Remove error message
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
          input.parentNode.removeChild(existingError);
        }
      }
    });
    
    return isValid;
  }
};

// Make the form handler available globally
window.formHandler = formHandler;

// Initialize form handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  formHandler.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = formHandler;
}