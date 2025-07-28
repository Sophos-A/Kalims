from flask import Blueprint, render_template
from flask_socketio import SocketIO, emit
from . import socketio, db  # Assuming you have db setup
from .models import TriageCase  # Assuming you have a TriageCase model
from datetime import datetime, timedelta
import time
import threading

dashboard_bp = Blueprint('dashboard', __name__)

# In-memory storage for real-time data (in production, use Redis)
active_cases = []
recent_alerts = []
system_status = {
    "ai_service": "online",
    "database": "online",
    "response_time": 0.42,
    "last_updated": datetime.utcnow()
}

@dashboard_bp.route('/')
def dashboard_home():
    """Main dashboard view"""
    # Get stats for the last 24 hours
    stats = {
        "total_cases": TriageCase.query.count(),
        "critical_cases": TriageCase.query.filter_by(severity="CRITICAL").count(),
        "avg_response_time": 0.75,
        "cases_by_hour": [12, 15, 8, 10, 7, 20, 25, 30, 28, 22, 18, 15]
    }
    
    return render_template('dashboard.html', 
                           stats=stats,
                           active_cases=active_cases[:10],
                           recent_alerts=recent_alerts[:5],
                           system_status=system_status)

def background_thread():
    """Simulate real-time data updates"""
    while True:
        time.sleep(5)
        # Update system status
        system_status["response_time"] = max(0.1, min(2.0, system_status["response_time"] + (0.1 if system_status["response_time"] < 0.5 else -0.1)))
        system_status["last_updated"] = datetime.utcnow()
        
        # Emit updates to all connected clients
        socketio.emit('system_update', system_status, namespace='/dashboard')
        socketio.emit('cases_update', {"count": len(active_cases)}, namespace='/dashboard')
        
        # Simulate new cases
        if len(active_cases) < 20 and datetime.utcnow().second % 15 == 0:
            new_case = {
                "id": f"C{len(active_cases)+1000}",
                "severity": "HIGH" if len(active_cases) % 3 == 0 else "MODERATE",
                "symptoms": "Headache, vision loss" if len(active_cases) % 4 == 0 else "Seizure activity",
                "arrival_time": datetime.utcnow().strftime("%H:%M:%S"),
                "duration": f"{len(active_cases)} min"
            }
            active_cases.append(new_case)
            socketio.emit('new_case', new_case, namespace='/dashboard')
            
            # Simulate critical alert
            if "vision loss" in new_case["symptoms"]:
                alert = {
                    "id": f"A{len(recent_alerts)+100}",
                    "case_id": new_case["id"],
                    "message": "Possible stroke detected! NIHSS score: 8",
                    "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
                    "priority": "CRITICAL"
                }
                recent_alerts.append(alert)
                socketio.emit('new_alert', alert, namespace='/dashboard')

# Start background thread when module loads
threading.Thread(target=background_thread, daemon=True).start()

# SocketIO event handlers
@socketio.on('connect', namespace='/dashboard')
def dashboard_connect():
    emit('connection_ack', {'data': 'Connected to Neuro Triage Dashboard'})

@socketio.on('acknowledge_alert', namespace='/dashboard')
def handle_acknowledge(data):
    alert_id = data['alert_id']
    # In a real system, update alert status in database
    emit('alert_acknowledged', {'alert_id': alert_id}, broadcast=True)