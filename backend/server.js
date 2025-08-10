require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./config/db');
const WebSocketService = require('./services/webSocketService');

// Routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const queueRoutes = require('./routes/queue');
const triageRoutes = require('./routes/triage');
const checkinRoutes = require('./routes/checkin');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const visitRoutes = require('./routes/visits');
const aiTriageRoutes = require('./routes/aiTriage');
const patientAuthRoutes = require('./routes/patientAuth');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
const staffRoutes = require('./routes/staff');

// Middleware
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for WebSocket support
const server = app;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Make WebSocket service globally available
global.webSocketService = webSocketService;

// ======================
// 🔐 SECURITY MIDDLEWARE
// ======================

// Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP unless you add script-src for dev
  crossOriginEmbedderPolicy: false,
}));

// CORS: Use custom CORS middleware
const corsMiddleware = require('./middleware/cors');
app.use(corsMiddleware());

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');


// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests from this IP. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ======================
// 🧱 BODY PARSING
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// 🌐 DATABASE CONNECTION TEST
// ======================
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to Supabase PostgreSQL:', res.rows[0].now);
  }
});

// ======================
// 🚀 API ROUTES
// ======================

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'node-backend',
    timestamp: new Date().toISOString(),
    database: 'connected',
    fastapi: process.env.AI_ENDPOINT,
    env: {
      dbHost: process.env.DB_HOST,
      dbPort: process.env.DB_PORT,
      dbUser: process.env.DB_USER,
      fastapiEndpoint: process.env.AI_ENDPOINT,
      allowedOrigins: process.env.ALLOWED_ORIGINS
    }
  });
});

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes); // QR code check-in (public access)
app.use('/api/patient-auth', patientAuthRoutes); // Patient login and registration (public access)

// Protected Routes (require JWT)
app.use('/api/patients', authMiddleware(), patientRoutes);
app.use('/api/queue', authMiddleware(), queueRoutes);
app.use('/api/triage', authMiddleware(), triageRoutes);
app.use('/api/notifications', authMiddleware(), notificationRoutes);
app.use('/api/reports', authMiddleware(), reportRoutes);
app.use('/api/visits', authMiddleware(), visitRoutes);
app.use('/api/ai-triage', authMiddleware(), aiTriageRoutes);
app.use('/api/appointments', authMiddleware(), appointmentRoutes);
app.use('/api/doctors', authMiddleware(), doctorRoutes);
app.use('/api/staff', authMiddleware(), staffRoutes);

// Fallback for undefined routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: "API endpoint not found"
  });
});

// ======================
// 🌐 SERVE STATIC FILES
// ======================
// Serve static files from the Frontend directory
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

// Route all non-API requests to the appropriate HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'entry.html'));
});

app.get('/entry', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'entry.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'admin.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'staff.html'));
});

app.get('/patient', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Frontend', 'patientsignin.html'));
});

// Fallback route - send to main page
app.get('*', (req, res) => {
  // Skip API routes which are handled by the API fallback
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'Frontend', 'entry.html'));
  }
});

// ======================
// 🛠️ ERROR HANDLING MIDDLEWARE
// ======================
app.use(errorHandler);

// ======================
// 🔚 START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🟢 Node.js backend is running on port ${PORT}`);
  console.log(`🔗 AI Triage Service: ${process.env.AI_ENDPOINT}`);
  console.log(`🛡️  JWT Secret loaded: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`🌐 CORS: Configured with middleware`);
  console.log(`📊 Rate Limit: 100 requests / 15 min per IP`);
});