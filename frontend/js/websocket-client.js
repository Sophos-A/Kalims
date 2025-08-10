/**
 * WebSocket Client for KALIMS Hospital System
 * Handles real-time updates for queue positions, notifications, and appointments
 */

class KALIMSWebSocketClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = 5000; // 5 seconds
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.callbacks = {
            queueUpdate: [],
            notificationUpdate: [],
            appointmentUpdate: []
        };
    }
    
    // Connect to WebSocket server
    connect() {
        // Use the backend server port for WebSocket connection
        const wsUrl = `ws://localhost:3002`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleReconnect();
        }
    }
    
    // Set up WebSocket event handlers
    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Send authentication token if available
            const token = localStorage.getItem('token');
            if (token) {
                this.sendAuth(token);
            }
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.isConnected = false;
            this.handleReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
        };
    }
    
    // Handle reconnection
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            console.log('Max reconnection attempts reached. Please refresh the page.');
        }
    }
    
    // Send authentication token
    sendAuth(token) {
        this.sendMessage({
            type: 'auth',
            token: token
        });
    }
    
    // Subscribe to updates
    subscribe(channel) {
        this.sendMessage({
            type: 'subscribe',
            channel: channel
        });
    }
    
    // Unsubscribe from updates
    unsubscribe(channel) {
        this.sendMessage({
            type: 'unsubscribe',
            channel: channel
        });
    }
    
    // Send message to server
    sendMessage(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected. Message not sent:', message);
        }
    }
    
    // Handle incoming messages
    handleMessage(data) {
        switch (data.type) {
            case 'welcome':
                console.log('WebSocket server welcome message:', data.message);
                break;
                
            case 'queue_update':
                this.handleQueueUpdate(data);
                break;
                
            case 'notification_update':
                this.handleNotificationUpdate(data);
                break;
                
            case 'appointment_update':
                this.handleAppointmentUpdate(data);
                break;
                
            case 'error':
                console.error('WebSocket server error:', data.message);
                break;
                
            default:
                console.warn('Unknown WebSocket message type:', data.type);
        }
    }
    
    // Handle queue updates
    handleQueueUpdate(data) {
        console.log('Queue update received:', data);
        this.callbacks.queueUpdate.forEach(callback => {
            callback(data.queueType, data.data);
        });
    }
    
    // Handle notification updates
    handleNotificationUpdate(data) {
        console.log('Notification update received:', data);
        this.callbacks.notificationUpdate.forEach(callback => {
            callback(data.recipientType, data.recipientId, data.data);
        });
    }
    
    // Handle appointment updates
    handleAppointmentUpdate(data) {
        console.log('Appointment update received:', data);
        this.callbacks.appointmentUpdate.forEach(callback => {
            callback(data.patientId, data.data);
        });
    }
    
    // Register callback for queue updates
    onQueueUpdate(callback) {
        this.callbacks.queueUpdate.push(callback);
    }
    
    // Register callback for notification updates
    onNotificationUpdate(callback) {
        this.callbacks.notificationUpdate.push(callback);
    }
    
    // Register callback for appointment updates
    onAppointmentUpdate(callback) {
        this.callbacks.appointmentUpdate.push(callback);
    }
    
    // Close WebSocket connection
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Create singleton instance
const webSocketClient = new KALIMSWebSocketClient();

// Export for use in other files
window.webSocketClient = webSocketClient;

// Auto-connect when script loads
webSocketClient.connect();
