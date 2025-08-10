const WebSocket = require('ws');

class WebSocketService {
    constructor(server) {
        // Create WebSocket server
        this.wss = new WebSocket.Server({ server });
        this.clients = new Set();
        
        // Initialize WebSocket server
        this.initializeWebSocketServer();
    }
    
    // Initialize WebSocket server with event handlers
    initializeWebSocketServer() {
        this.wss.on('connection', (ws) => {
            // Add client to set
            this.clients.add(ws);
            
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Connected to KALIMS WebSocket server'
            }));
            
            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });
            
            // Handle client disconnect
            ws.on('close', () => {
                this.clients.delete(ws);
            });
            
            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
    }
    
    // Handle incoming WebSocket messages
    handleMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                // Subscribe client to specific updates
                ws.subscriptions = ws.subscriptions || new Set();
                ws.subscriptions.add(data.channel);
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    channel: data.channel
                }));
                break;
                
            case 'unsubscribe':
                // Unsubscribe client from specific updates
                if (ws.subscriptions) {
                    ws.subscriptions.delete(data.channel);
                    ws.send(JSON.stringify({
                        type: 'unsubscribed',
                        channel: data.channel
                    }));
                }
                break;
                
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }
    
    // Broadcast message to all connected clients
    broadcast(message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }
    
    // Send message to specific clients subscribed to a channel
    broadcastToChannel(channel, message) {
        const messageString = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && 
                client.subscriptions && 
                client.subscriptions.has(channel)) {
                client.send(messageString);
            }
        });
    }
    
    // Send message to a specific client
    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    
    // Broadcast queue updates
    broadcastQueueUpdate(queueType, queueData) {
        // Broadcast to general queue channel
        this.broadcastToChannel('queue', {
            type: 'queue_update',
            queueType,
            data: queueData
        });
        
        // Also broadcast to consultation channel if it's a doctor queue
        if (queueType === 'doctor') {
            this.broadcastToChannel('consultation', {
                type: 'queue_update',
                queueType,
                data: queueData
            });
        }
        
        // Send targeted update to specific patient if patientId is available
        if (queueData && queueData.patientId) {
            // Send to patient's general channel
            this.broadcastToChannel(`patient-${queueData.patientId}`, {
                type: 'queue_update',
                queueType,
                data: queueData
            });
            
            // Send to patient's consultation-specific channel if it's a doctor queue
            if (queueType === 'doctor') {
                this.broadcastToChannel(`patient-${queueData.patientId}-consultation`, {
                    type: 'queue_update',
                    queueType,
                    data: queueData
                });
            }
        }
    }
    
    // Broadcast notification updates
    broadcastNotificationUpdate(recipientType, recipientId, notificationData) {
        this.broadcastToChannel('notifications', {
            type: 'notification_update',
            recipientType,
            recipientId,
            data: notificationData
        });
    }
    
    // Broadcast appointment updates
    broadcastAppointmentUpdate(patientId, appointmentData) {
        this.broadcastToChannel('appointments', {
            type: 'appointment_update',
            patientId,
            data: appointmentData
        });
    }
    
    // Close WebSocket server
    close() {
        this.wss.close();
    }
}

module.exports = WebSocketService;
