require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const queueRoutes = require('./routes/queue');
const triageRoutes = require('./routes/triage');

// Middleware
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// 🔐 SECURITY MIDDLEWARE
// ======================

// Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP unless you add script-src for dev
  crossOriginEmbedderPolicy: false,
}));

// CORS: Only allow trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Public Auth Routes
app.use('/api/auth', authRoutes);

// Protected Routes (require JWT)
app.use('/api/patients', authMiddleware, patientRoutes);
app.use('/api/queue', authMiddleware, queueRoutes);
app.use('/api/triage', authMiddleware, triageRoutes);

// Fallback for undefined routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: "API endpoint not found"
  });
});

// ======================
// 🛠️ ERROR HANDLING MIDDLEWARE
// ======================
app.use((err, req, res, next) => {
  console.error('🚨 Global Error:', err.stack);
  res.status(err.status || 500).json({
    error: 'Something went wrong on the server.',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======================
// 🔚 START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🟢 Node.js backend is running on port ${PORT}`);
  console.log(`🔗 AI Triage Service: ${process.env.AI_ENDPOINT}`);
  console.log(`🛡️  JWT Secret loaded: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`🌐 Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`📊 Rate Limit: 100 requests / 15 min per IP`);
});