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

module.exports = (req, res, next) => {
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
      error: 'Access denied. Token must be Bearer type.',
      code: 'INVALID_AUTH_FORMAT'
    });
  }

  // 🛡️ Step 2: Verify the JWT using the secret from .env
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Token is valid — attach user to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // 🔍 Optional: Log authenticated action
    console.log(`🔐 Authenticated user: ${decoded.email} (Role: ${decoded.role})`);

    // ✅ Proceed to the next middleware or route handler
    next();
  } catch (err) {
    // ❌ Token is invalid, expired, or tampered with
    console.error('JWT Verification Error:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'Token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Invalid token. Authentication failed.',
        code: 'INVALID_TOKEN'
      });
    }

    if (err.name === 'NotBeforeError') {
      return res.status(403).json({
        error: 'Token is not yet valid.',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    // Generic fallback
    return res.status(403).json({
      error: 'Forbidden. Invalid or malformed authentication token.',
      code: 'AUTH_FAILED'
    });
  }
};
