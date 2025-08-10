/**
 * QR Scanner utility for KALIMS Frontend
 * Handles QR code scanning functionality
 */

// Import connection utility if available
const connection = window.connection || {};
const apiClient = window.apiClient || {};

/**
 * QR Scanner utility object
 */
const qrScanner = {
  scanner: null,
  videoElem: null,
  scannerContainer: null,
  
  /**
   * Initialize QR scanner
   * @param {string} containerId - ID of the container element
   * @param {Function} onScanCallback - Callback function when QR is scanned
   */
  init: function(containerId, onScanCallback) {
    this.scannerContainer = document.getElementById(containerId);
    if (!this.scannerContainer) {
      console.error('Scanner container not found');
      return false;
    }
    
    // Create video element
    this.videoElem = document.createElement('video');
    this.scannerContainer.appendChild(this.videoElem);
    
    // Load QR Scanner library dynamically if not already loaded
    if (typeof Html5QrcodeScanner === 'undefined') {
      this.loadQRLibrary(() => {
        this.initScanner(onScanCallback);
      });
    } else {
      this.initScanner(onScanCallback);
    }
    
    return true;
  },
  
  /**
   * Load QR Scanner library
   * @param {Function} callback - Callback function when library is loaded
   */
  loadQRLibrary: function(callback) {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode';
    script.onload = callback;
    document.head.appendChild(script);
  },
  
  /**
   * Initialize scanner
   * @param {Function} onScanCallback - Callback function when QR is scanned
   */
  initScanner: function(onScanCallback) {
    try {
      this.scanner = new Html5QrcodeScanner(
        this.scannerContainer.id,
        { fps: 10, qrbox: 250 },
        /* verbose= */ false
      );
      
      this.scanner.render((qrCode) => {
        // Stop scanner after successful scan
        this.stop();
        
        // Call callback with QR code
        if (typeof onScanCallback === 'function') {
          onScanCallback(qrCode);
        } else {
          // Default behavior: fill QR code input and submit form
          const qrInput = document.getElementById('qrCode');
          const qrForm = document.getElementById('qrScanForm');
          
          if (qrInput && qrForm) {
            qrInput.value = qrCode;
            qrForm.dispatchEvent(new Event('submit'));
          }
        }
      }, (error) => {
        // Handle scan error
        console.error('QR scan error:', error);
      });
    } catch (error) {
      console.error('Error initializing QR scanner:', error);
      return false;
    }
    
    return true;
  },
  
  /**
   * Stop scanner
   */
  stop: function() {
    if (this.scanner) {
      try {
        this.scanner.clear();
      } catch (error) {
        console.error('Error stopping QR scanner:', error);
      }
    }
  },
  
  /**
   * Process scanned QR code
   * @param {string} qrCode - Scanned QR code
   */
  processQRCode: async function(qrCode) {
    try {
      // Get patient information from QR code
      const result = await apiClient.checkin.scan(qrCode);
      
      // Display patient information
      const patientInfo = document.getElementById('patientInfo');
      if (patientInfo) {
        patientInfo.innerHTML = `
          <h3>Patient Information</h3>
          <p><strong>Name:</strong> ${result.patient.name}</p>
          <p><strong>DOB:</strong> ${connection.formatDate(result.patient.dob)}</p>
          <p><strong>Gender:</strong> ${result.patient.gender}</p>
          <p><strong>Category:</strong> ${result.patient.category_name || 'Regular'}</p>
        `;
        patientInfo.style.display = 'block';
      }
      
      // Show check-in form
      const checkinForm = document.getElementById('checkinForm');
      if (checkinForm) {
        document.getElementById('hiddenQrCode').value = qrCode;
        checkinForm.style.display = 'block';
      }
      
      return result;
    } catch (error) {
      connection.handleError(error);
      return null;
    }
  }
};

// Make the QR scanner available globally
window.qrScanner = qrScanner;

// Initialize QR scanner when DOM is loaded if container exists
document.addEventListener('DOMContentLoaded', () => {
  const scannerContainer = document.getElementById('qrScanner');
  if (scannerContainer) {
    // Initialize scanner with default callback
    qrScanner.init('qrScanner');
    
    // Setup manual QR code input form
    const manualQRForm = document.getElementById('manualQRForm');
    if (manualQRForm) {
      manualQRForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const manualQRCode = document.getElementById('manualQRCode').value;
        if (manualQRCode) {
          qrScanner.processQRCode(manualQRCode);
        }
      });
    }
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = qrScanner;
}