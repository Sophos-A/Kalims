/**
 * CORS middleware for handling cross-origin requests
 */
const cors = require('cors');

/**
 * Configure CORS options
 * @param {Object} options - CORS configuration options
 * @returns {Function} Configured CORS middleware
 */
module.exports = (options = {}) => {
  // Default allowed origins from environment or fallback to common development origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:3000'
      ];
  
  // Default CORS configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
  
  // Merge with custom options
  const mergedOptions = { ...corsOptions, ...options };
  
  return cors(mergedOptions);
};