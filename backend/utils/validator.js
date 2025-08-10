/**
 * Utility functions for input validation
 */

/**
 * Validate patient data
 * @param {Object} data - Patient data to validate
 * @returns {Object} Validation result with errors if any
 */
exports.validatePatient = (data) => {
  const errors = {};
  
  // Required fields
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Name is required';
  }
  
  if (!data.dob) {
    errors.dob = 'Date of birth is required';
  } else {
    // Check if date is valid
    const dobDate = new Date(data.dob);
    if (isNaN(dobDate.getTime())) {
      errors.dob = 'Invalid date format';
    }
  }
  
  if (!data.gender || !['male', 'female', 'other'].includes(data.gender.toLowerCase())) {
    errors.gender = 'Gender must be male, female, or other';
  }
  
  // Optional fields with format validation
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (data.phone && !/^\+?[0-9\s-()]{8,15}$/.test(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate triage data
 * @param {Object} data - Triage data to validate
 * @returns {Object} Validation result with errors if any
 */
exports.validateTriage = (data) => {
  const errors = {};
  
  // Required fields
  if (!data.visitId) {
    errors.visitId = 'Visit ID is required';
  }
  
  if (!data.symptoms || data.symptoms.trim() === '') {
    errors.symptoms = 'Symptoms are required';
  }
  
  if (!data.urgencyLevel || !['low', 'medium', 'high', 'critical'].includes(data.urgencyLevel.toLowerCase())) {
    errors.urgencyLevel = 'Urgency level must be low, medium, high, or critical';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate user data
 * @param {Object} data - User data to validate
 * @returns {Object} Validation result with errors if any
 */
exports.validateUser = (data) => {
  const errors = {};
  
  // Required fields
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Name is required';
  }
  
  if (!data.email || data.email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  if (!data.role || !['admin', 'doctor', 'nurse', 'staff'].includes(data.role.toLowerCase())) {
    errors.role = 'Role must be admin, doctor, nurse, or staff';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};