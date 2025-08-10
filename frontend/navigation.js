// Central Navigation System for KALIMS Triage System
// This file provides consistent navigation across all pages

const NavigationHelper = {
    // Main navigation links
    links: {
        home: 'entry.html',
        patient: 'patientsignin.html',
        staff: 'staff.html',
        admin: 'staff_management.html',
        triage: 'view_triage.html',
        status: 'patient_status.html',
        statistics: 'statistics.html'
    },

    // Create navigation HTML
    createNavHTML: function(currentPage = '') {
        return `
            <nav class="main-nav">
                <a href="${this.links.home}" ${currentPage === 'home' ? 'class="active"' : ''}>🏠 Home</a>
                <a href="${this.links.patient}" ${currentPage === 'patient' ? 'class="active"' : ''}>👤 Patient Portal</a>
                <a href="${this.links.staff}" ${currentPage === 'staff' ? 'class="active"' : ''}>👨‍⚕️ Staff Portal</a>
                <a href="${this.links.admin}" ${currentPage === 'admin' ? 'class="active"' : ''}>👨‍💼 Admin Portal</a>
                <a href="${this.links.triage}" ${currentPage === 'triage' ? 'class="active"' : ''}>📋 View Queue</a>
                <a href="${this.links.status}" ${currentPage === 'status' ? 'class="active"' : ''}>📊 Patient Status</a>
                <a href="${this.links.statistics}" ${currentPage === 'statistics' ? 'class="active"' : ''}>📈 Statistics</a>
            </nav>
        `;
    },

    // Inject navigation into page
    injectNavigation: function(currentPage = '') {
        const navHTML = this.createNavHTML(currentPage);
        const headerElement = document.querySelector('header');
        if (headerElement) {
            headerElement.insertAdjacentHTML('afterend', navHTML);
        }
    },

    // Add navigation styles
    addNavigationStyles: function() {
        const styles = `
            <style>
                .main-nav {
                    background: linear-gradient(135deg, #333, #555);
                    padding: 15px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    position: sticky;
                    top: 0;
                    z-index: 999;
                }
                
                .main-nav a {
                    color: white;
                    margin: 0 15px;
                    text-decoration: none;
                    font-weight: bold;
                    padding: 10px 15px;
                    border-radius: 6px;
                    transition: all 0.3s ease;
                    display: inline-block;
                    font-size: 14px;
                }
                
                .main-nav a:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                }
                
                .main-nav a.active {
                    background-color: var(--primary, #166534);
                    color: white;
                }
                
                @media (max-width: 768px) {
                    .main-nav {
                        padding: 10px 5px;
                    }
                    
                    .main-nav a {
                        margin: 5px;
                        padding: 8px 12px;
                        font-size: 12px;
                        display: inline-block;
                    }
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    },

    // Initialize navigation system
    init: function(currentPage = '') {
        // Add styles first
        this.addNavigationStyles();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.injectNavigation(currentPage);
            });
        } else {
            this.injectNavigation(currentPage);
        }
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.NavigationHelper = NavigationHelper;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationHelper;
}
