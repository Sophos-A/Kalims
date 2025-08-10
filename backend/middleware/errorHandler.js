/**
 * Global error handling middleware
 */
const apiResponse = require('../utils/apiResponse');

/**
 * Handle errors globally
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
module.exports = (err, req, res, next) => {
  // Log error for debugging
  console.error('🚨 Global Error:', err);
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong on the server';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    return apiResponse.validationError(res, err.errors, message);
  }
  
  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    statusCode = 401;
    message = 'Unauthorized access';
    return apiResponse.unauthorized(res, message);
  }
  
  if (err.name === 'ForbiddenError' || err.message === 'Forbidden') {
    statusCode = 403;
    message = 'Access forbidden';
    return apiResponse.forbidden(res, message);
  }
  
  if (err.name === 'NotFoundError' || err.message === 'Not found') {
    statusCode = 404;
    message = 'Resource not found';
    return apiResponse.notFound(res, message);
  }
  
  // Handle database errors
  if (err.code === '23505') { // Unique violation in PostgreSQL
    statusCode = 409;
    message = 'Duplicate entry';
  }
  
  // Send error response
  return apiResponse.error(res, message, statusCode, {
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};