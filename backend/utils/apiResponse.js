/**
 * Utility functions for consistent API responses
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
exports.success = (res, data = {}, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} errors - Additional error details
 */
exports.error = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    error: message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} message - Not found message
 */
exports.notFound = (res, message = 'Resource not found') => {
  res.status(404).json({
    success: false,
    error: message
  });
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 * @param {string} message - Error message
 */
exports.validationError = (res, errors, message = 'Validation failed') => {
  res.status(400).json({
    success: false,
    error: message,
    errors
  });
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Unauthorized message
 */
exports.unauthorized = (res, message = 'Unauthorized access') => {
  res.status(401).json({
    success: false,
    error: message
  });
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Forbidden message
 */
exports.forbidden = (res, message = 'Access forbidden') => {
  res.status(403).json({
    success: false,
    error: message
  });
};