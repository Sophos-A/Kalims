// Initialize Socket.IO connection
const socket = io.connect('/dashboard');

// Initialize charts
const ctx = document.getElementById('cases-by-hour-chart').getContext('2d');
const casesChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['00-02', '02-04', '04-06', '06-08', '08-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24'],
        datasets: [{
            label: 'Cases per 2-hour interval',
            data: JSON.parse('{{ stats.cases_by_hour | tojson }}'),
            backgroundColor: 'rgba(52, 152, 219, 0.6)',
            borderColor: 'rgba(52, 152, 219, 1)',
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0
                }
            }
        }
    }
});

// Socket event handlers
socket.on('connection_ack', function(data) {
    console.log('Connected to dashboard:', data.data);
});

socket.on('new_case', function(caseData) {
    const tableBody = document.getElementById('cases-table-body');
    const newRow = document.createElement('tr');
    newRow.className = `case-row severity-${caseData.severity.toLowerCase()}`;
    
    newRow.innerHTML = `
        <td>${caseData.id}</td>
        <td><span class="severity-badge">${caseData.severity}</span></td>
        <td>${caseData.symptoms}</td>
        <td>${caseData.arrival_time}</td>
        <td>${caseData.duration}</td>
    `;
    
    tableBody.prepend(newRow);
    
    // Update active cases count
    const countElement = document.getElementById('active-cases-count');
    countElement.textContent = parseInt(countElement.textContent) + 1;
});

socket.on('new_alert', function(alertData) {
    const alertsContainer = document.querySelector('.alerts-container');
    const noAlerts = document.querySelector('.no-alerts');
    
    if (noAlerts) {
        alertsContainer.removeChild(noAlerts);
    }
    
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item priority-${alertData.priority.toLowerCase()}`;
    
    alertItem.innerHTML = `
        <div class="alert-header">
            <span class="alert-id">Alert #${alertData.id}</span>
            <span class="alert-time">${alertData.timestamp}</span>
            <span class="alert-priority">${alertData.priority}</span>
        </div>
        <div class="alert-content">
            <strong>Case ${alertData.case_id}:</strong> ${alertData.message}
        </div>
        <div class="alert-actions">
            <button class="acknowledge-btn" data-alert-id="${alertData.id}">Acknowledge</button>
            <button class="details-btn">View Details</button>
        </div>
    `;
    
    alertsContainer.prepend(alertItem);
    
    // Update alerts count
    const countElement = document.getElementById('alerts-count');
    countElement.textContent = parseInt(countElement.textContent) + 1;
    
    // Add event listener to new acknowledge button
    alertItem.querySelector('.acknowledge-btn').addEventListener('click', function() {
        const alertId = this.getAttribute('data-alert-id');
        socket.emit('acknowledge_alert', { alert_id: alertId });
    });
});

socket.on('alert_acknowledged', function(data) {
    const alertItems = document.querySelectorAll('.alert-item');
    alertItems.forEach(item => {
        const alertId = item.querySelector('.alert-id').textContent.split('#')[1];
        if (alertId === data.alert_id) {
            item.style.opacity = '0.6';
            item.querySelector('.acknowledge-btn').disabled = true;
            item.querySelector('.acknowledge-btn').textContent = 'Acknowledged';
            
            // Update alerts count
            const countElement = document.getElementById('alerts-count');
            countElement.textContent = parseInt(countElement.textContent) - 1;
        }
    });
});

socket.on('system_update', function(data) {
    document.getElementById('last-updated-time').textContent = 
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Update response time
    document.querySelector('.response-time .status-value').textContent = data.response_time.toFixed(2) + 's';
    
    // Update gauge
    document.querySelector('.metric-gauge .gauge-fill').style.width = `${data.response_time * 50}%`;
});

// Event delegation for acknowledge buttons
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('acknowledge-btn')) {
        const alertId = e.target.getAttribute('data-alert-id');
        socket.emit('acknowledge_alert', { alert_id: alertId });
    }
});