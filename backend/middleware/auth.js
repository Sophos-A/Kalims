const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Authentication middleware
 * 
 * This middleware:
 * - Checks for 'Authorization' header
 * - Extracts and verifies JWT
 * - Attaches user data to `req.user`
 * - Returns 401/403 on failure
 * 
 * Used in: patients.js, queue.js, triage.js
 */

module.exports = function authenticateToken(allowPatient = false) {
  return (req, res, next) => {
    // 🛑 Step 1: Extract token from Authorization header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied. No authorization header provided.',
        code: 'NO_AUTH_HEADER'
      });
    }

    // Format: "Bearer TOKEN"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    try {
      // 🔐 Step 2: Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // ✅ Step 3: Attach user data to request
      req.user = decoded;
      
      // Check if this is a patient token and if patient tokens are allowed
      if (decoded.type === 'patient' && !allowPatient) {
        return res.status(403).json({
          error: 'Access denied. Patient accounts cannot access this resource.',
          code: 'PATIENT_ACCESS_DENIED'
        });
      }
      
      // ➡️ Step 4: Continue to route handler
      next();
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      
      // 🚫 Step 5: Return appropriate error based on JWT error type
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Access denied. Token has expired.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'Access denied. Invalid token.',
          code: 'INVALID_TOKEN'
        });
      } else {
        return res.status(403).json({
          error: 'Access denied. Token verification failed.',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    }
  };
};
