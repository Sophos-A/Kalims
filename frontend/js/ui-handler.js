/**
 * UI Handler utility for KALIMS Frontend
 * Handles UI components and interactions
 */

// Import connection utility if available
const connection = window.connection || {};
const apiClient = window.apiClient || {};

/**
 * UI Handler utility object
 */
const uiHandler = {
  /**
   * Initialize UI handlers
   */
  init: function() {
    this.setupNavigation();
    this.setupNotifications();
    this.setupQueueDisplay();
    this.setupDashboardWidgets();
    this.setupThemeToggle();
    this.setupMobileMenu();
  },
  
  /**
   * Setup navigation
   */
  setupNavigation: function() {
    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
      const linkPage = link.getAttribute('href').split('/').pop();
      if (currentPage === linkPage) {
        link.classList.add('active');
      }
    });
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
      });
    }
  },
  
  /**
   * Setup notifications
   */
  setupNotifications: function() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationPanel = document.getElementById('notificationPanel');
    
    if (notificationBtn && notificationPanel) {
      // Toggle notification panel
      notificationBtn.addEventListener('click', () => {
        notificationPanel.classList.toggle('show');
        this.loadNotifications();
      });
      
      // Close panel when clicking outside
      document.addEventListener('click', (e) => {
        if (!notificationBtn.contains(e.target) && !notificationPanel.contains(e.target)) {
          notificationPanel.classList.remove('show');
        }
      });
    }
  },
  
  /**
   * Load notifications
   */
  loadNotifications: async function() {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    try {
      const notifications = await apiClient.notifications.getAll();
      
      if (notifications.length === 0) {
        notificationList.innerHTML = '<li class="no-notifications">No notifications</li>';
        return;
      }
      
      notificationList.innerHTML = '';
      
      notifications.forEach(notification => {
        const li = document.createElement('li');
        li.className = notification.read ? 'notification read' : 'notification unread';
        
        li.innerHTML = `
          <div class="notification-content">
            <h4>${notification.title}</h4>
            <p>${notification.message}</p>
            <span class="notification-time">${connection.formatDate(notification.created_at)}</span>
          </div>
        `;
        
        // Mark as read when clicked
        li.addEventListener('click', async () => {
          if (!notification.read) {
            await apiClient.notifications.markAsRead(notification.id);
            li.classList.remove('unread');
            li.classList.add('read');
          }
        });
        
        notificationList.appendChild(li);
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
      notificationList.innerHTML = '<li class="error">Error loading notifications</li>';
    }
  },
  
  /**
   * Setup queue display
   */
  setupQueueDisplay: function() {
    const queueTable = document.getElementById('queueTable');
    if (!queueTable) return;
    
    // Load queue data
    this.loadQueueData();
    
    // Refresh queue every 30 seconds
    setInterval(() => {
      this.loadQueueData();
    }, 30000);
  },
  
  /**
   * Load queue data
   */
  loadQueueData: async function() {
    const queueTable = document.getElementById('queueTable');
    const queueBody = queueTable?.querySelector('tbody');
    if (!queueBody) return;
    
    try {
      const queueData = await apiClient.queue.getAll();
      
      queueBody.innerHTML = '';
      
      queueData.forEach(item => {
        const tr = document.createElement('tr');
        
        // Set row class based on urgency level
        if (item.urgency_level === 'high') {
          tr.className = 'urgent';
        } else if (item.urgency_level === 'medium') {
          tr.className = 'medium';
        }
        
        tr.innerHTML = `
          <td>${item.position}</td>
          <td>${item.patient_name}</td>
          <td>${item.urgency_level}</td>
          <td>${item.status}</td>
          <td>${item.assigned_to || 'Not assigned'}</td>
          <td>
            <button class="btn btn-sm btn-primary action-btn" data-id="${item.id}" data-action="assign">Assign</button>
            <button class="btn btn-sm btn-success action-btn" data-id="${item.id}" data-action="complete">Complete</button>
          </td>
        `;
        
        queueBody.appendChild(tr);
      });
      
      // Setup action buttons
      const actionButtons = queueBody.querySelectorAll('.action-btn');
      actionButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.getAttribute('data-id');
          const action = btn.getAttribute('data-action');
          
          if (action === 'assign') {
            const user = connection.getCurrentUser();
            if (user) {
              try {
                await apiClient.queue.assignDoctor(id, user.id);
                this.loadQueueData(); // Refresh queue
              } catch (error) {
                connection.handleError(error);
              }
            }
          } else if (action === 'complete') {
            try {
              await apiClient.queue.updateStatus(id, 'completed');
              this.loadQueueData(); // Refresh queue
            } catch (error) {
              connection.handleError(error);
            }
          }
        });
      });
    } catch (error) {
      console.error('Error loading queue data:', error);
      queueBody.innerHTML = `<tr><td colspan="6" class="error">Error loading queue data</td></tr>`;
    }
  },
  
  /**
   * Setup dashboard widgets
   */
  setupDashboardWidgets: function() {
    const dashboardStats = document.getElementById('dashboardStats');
    if (!dashboardStats) return;
    
    // Load dashboard data
    this.loadDashboardData();
    
    // Setup visits display if available
    this.setupVisitsDisplay();
  },
  
  /**
   * Load dashboard data
   */
  loadDashboardData: async function() {
    const dashboardStats = document.getElementById('dashboardStats');
    if (!dashboardStats) return;
    
    try {
      const dailyReport = await apiClient.reports.daily();
      
      // Update stats widgets
      const totalPatientsWidget = document.getElementById('totalPatients');
      const waitingPatientsWidget = document.getElementById('waitingPatients');
      const completedVisitsWidget = document.getElementById('completedVisits');
      const avgWaitTimeWidget = document.getElementById('avgWaitTime');
      
      if (totalPatientsWidget) {
        totalPatientsWidget.textContent = dailyReport.totalPatients || 0;
      }
      
      if (waitingPatientsWidget) {
        waitingPatientsWidget.textContent = dailyReport.waitingPatients || 0;
      }
      
      if (completedVisitsWidget) {
        completedVisitsWidget.textContent = dailyReport.completedVisits || 0;
      }
      
      if (avgWaitTimeWidget) {
        avgWaitTimeWidget.textContent = dailyReport.avgWaitTime || '0 mins';
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  },
  
  /**
   * Setup visits display
   */
  setupVisitsDisplay: function() {
    const visitsContainer = document.getElementById('visitsContainer');
    if (!visitsContainer) return;
    
    // Load active visits
    this.loadActiveVisits();
    
    // Setup refresh button if available
    const refreshVisitsBtn = document.getElementById('refreshVisitsBtn');
    if (refreshVisitsBtn) {
      refreshVisitsBtn.addEventListener('click', () => {
        this.loadActiveVisits();
      });
    }
    
    // Setup date range filter if available
    const dateRangeForm = document.getElementById('dateRangeForm');
    if (dateRangeForm) {
      dateRangeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        this.loadVisitsByDateRange(startDate, endDate);
      });
    }
  },
  
  /**
   * Load active visits
   */
  loadActiveVisits: async function() {
    const visitsContainer = document.getElementById('visitsContainer');
    if (!visitsContainer) return;
    
    try {
      const result = await apiClient.visits.getActive();
      this.renderVisits(result.visits, visitsContainer);
    } catch (error) {
      console.error('Error loading active visits:', error);
      visitsContainer.innerHTML = `<div class="alert alert-danger">Error loading visits</div>`;
    }
  },
  
  /**
   * Load visits by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   */
  loadVisitsByDateRange: async function(startDate, endDate) {
    const visitsContainer = document.getElementById('visitsContainer');
    if (!visitsContainer) return;
    
    try {
      const result = await apiClient.visits.getByDateRange(startDate, endDate);
      this.renderVisits(result.visits, visitsContainer);
    } catch (error) {
      console.error('Error loading visits by date range:', error);
      visitsContainer.innerHTML = `<div class="alert alert-danger">Error loading visits</div>`;
    }
  },
  
  /**
   * Render visits to container
   * @param {Array} visits - Array of visit objects
   * @param {HTMLElement} container - Container element
   */
  renderVisits: function(visits, container) {
    if (!visits || !visits.length) {
      container.innerHTML = `<div class="alert alert-info">No visits found</div>`;
      return;
    }
    
    let html = `
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Visit Date</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Doctor</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    visits.forEach(visit => {
      html += `
        <tr>
          <td>${visit.patient_name || 'Unknown'}</td>
          <td>${connection.formatDate(visit.visitDate)}</td>
          <td>${visit.reason || 'Not specified'}</td>
          <td>${visit.status}</td>
          <td>${visit.doctor_name || 'Not assigned'}</td>
          <td>
            <button class="btn btn-sm btn-primary view-visit-btn" data-id="${visit.id}">View</button>
            ${visit.status !== 'completed' ? `<button class="btn btn-sm btn-success complete-visit-btn" data-id="${visit.id}">Complete</button>` : ''}
          </td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    container.innerHTML = html;
    
    // Setup action buttons
    const viewButtons = container.querySelectorAll('.view-visit-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const visitId = btn.getAttribute('data-id');
        this.viewVisitDetails(visitId);
      });
    });
    
    const completeButtons = container.querySelectorAll('.complete-visit-btn');
    completeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const visitId = btn.getAttribute('data-id');
        this.showCompleteVisitForm(visitId);
      });
    });
  },
  
  /**
   * View visit details
   * @param {string} visitId - Visit ID
   */
  viewVisitDetails: async function(visitId) {
    try {
      const result = await apiClient.visits.getById(visitId);
      const visit = result.visit;
      
      // Create modal for visit details
      const modalHtml = `
        <div class="modal fade" id="visitDetailsModal" tabindex="-1" role="dialog" aria-labelledby="visitDetailsModalLabel" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="visitDetailsModalLabel">Visit Details</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <p><strong>Patient:</strong> ${visit.patient_name || 'Unknown'}</p>
                <p><strong>Visit Date:</strong> ${connection.formatDate(visit.visitDate)}</p>
                <p><strong>Reason:</strong> ${visit.reason || 'Not specified'}</p>
                <p><strong>Status:</strong> ${visit.status}</p>
                <p><strong>Doctor:</strong> ${visit.doctor_name || 'Not assigned'}</p>
                ${visit.diagnosis ? `<p><strong>Diagnosis:</strong> ${visit.diagnosis}</p>` : ''}
                ${visit.treatment ? `<p><strong>Treatment:</strong> ${visit.treatment}</p>` : ''}
                ${visit.notes ? `<p><strong>Notes:</strong> ${visit.notes}</p>` : ''}
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add modal to body
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);
      
      // Show modal
      $('#visitDetailsModal').modal('show');
      
      // Remove modal from DOM when hidden
      $('#visitDetailsModal').on('hidden.bs.modal', function () {
        $(this).remove();
      });
    } catch (error) {
      console.error('Error loading visit details:', error);
      connection.handleError(error);
    }
  },
  
  /**
   * Show complete visit form
   * @param {string} visitId - Visit ID
   */
  showCompleteVisitForm: async function(visitId) {
    try {
      const result = await apiClient.visits.getById(visitId);
      const visit = result.visit;
      
      // Create modal for completing visit
      const modalHtml = `
        <div class="modal fade" id="completeVisitModal" tabindex="-1" role="dialog" aria-labelledby="completeVisitModalLabel" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="completeVisitModalLabel">Complete Visit</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <form id="completeVisitForm">
                  <div class="form-group">
                    <label for="diagnosis">Diagnosis</label>
                    <textarea class="form-control" id="diagnosis" rows="3" required></textarea>
                  </div>
                  <div class="form-group">
                    <label for="treatment">Treatment</label>
                    <textarea class="form-control" id="treatment" rows="3" required></textarea>
                  </div>
                  <div class="form-group">
                    <label for="notes">Notes</label>
                    <textarea class="form-control" id="notes" rows="3"></textarea>
                  </div>
                  <input type="hidden" id="visitId" value="${visitId}">
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="submitCompleteVisit">Complete Visit</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add modal to body
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);
      
      // Show modal
      $('#completeVisitModal').modal('show');
      
      // Setup form submission
      document.getElementById('submitCompleteVisit').addEventListener('click', async () => {
        const diagnosis = document.getElementById('diagnosis').value;
        const treatment = document.getElementById('treatment').value;
        const notes = document.getElementById('notes').value;
        
        if (!diagnosis || !treatment) {
          connection.handleError(new Error('Diagnosis and treatment are required'));
          return;
        }
        
        try {
          await apiClient.visits.complete(visitId, { diagnosis, treatment, notes });
          connection.showSuccess('Visit completed successfully');
          $('#completeVisitModal').modal('hide');
          this.loadActiveVisits(); // Refresh visits
        } catch (error) {
          connection.handleError(error);
        }
      });
      
      // Remove modal from DOM when hidden
      $('#completeVisitModal').on('hidden.bs.modal', function () {
        $(this).remove();
      });
    } catch (error) {
      console.error('Error loading visit details:', error);
      connection.handleError(error);
    }
  },
  
  /**
   * Setup theme toggle
   */
  setupThemeToggle: function() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    // Check saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.body.classList.add(savedTheme);
      themeToggle.checked = savedTheme === 'dark-theme';
    }
    
    // Toggle theme
    themeToggle.addEventListener('change', () => {
      if (themeToggle.checked) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light-theme');
      }
    });
  },
  
  /**
   * Setup mobile menu
   */
  setupMobileMenu: function() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('show');
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
          mobileMenu.classList.remove('show');
        }
      });
    }
  }
};

// Make the UI handler available globally
window.uiHandler = uiHandler;

// Initialize UI handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  uiHandler.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = uiHandler;
}