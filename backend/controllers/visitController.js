/**
 * Visit Controller
 * Handles visit-related operations
 */

const Visit = require('../models/Visit');
const apiResponse = require('../utils/apiResponse');

/**
 * Get all visits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllVisits = async (req, res) => {
  try {
    const visits = await Visit.getAllVisits();
    return apiResponse.success(res, { visits });
  } catch (error) {
    console.error('Error getting all visits:', error);
    return apiResponse.error(res, 'Failed to retrieve visits');
  }
};

/**
 * Get visit by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVisitById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const visit = await Visit.getVisitById(id);
    
    if (!visit) {
      return apiResponse.notFound(res, 'Visit not found');
    }
    
    return apiResponse.success(res, { visit });
  } catch (error) {
    console.error(`Error getting visit with ID ${id}:`, error);
    return apiResponse.error(res, 'Failed to retrieve visit');
  }
};

/**
 * Get visits by patient ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVisitsByPatientId = async (req, res) => {
  const { patientId } = req.params;
  
  try {
    const visits = await Visit.getVisitsByPatientId(patientId);
    return apiResponse.success(res, { visits });
  } catch (error) {
    console.error(`Error getting visits for patient ${patientId}:`, error);
    return apiResponse.error(res, 'Failed to retrieve patient visits');
  }
};

/**
 * Create a new visit
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createVisit = async (req, res) => {
  const { patient_id, visit_type, status } = req.body;
  
  if (!patient_id) {
    return apiResponse.validationError(res, 'Patient ID is required');
  }
  
  try {
    const visitData = { patient_id, visit_type, status };
    const visit = await Visit.createVisit(visitData);
    
    return apiResponse.success(res, { visit }, 201);
  } catch (error) {
    console.error('Error creating visit:', error);
    return apiResponse.error(res, 'Failed to create visit');
  }
};

/**
 * Update a visit
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateVisit = async (req, res) => {
  const { id } = req.params;
  const { visit_type, status, doctor_id, notes } = req.body;
  
  try {
    // Check if visit exists
    const existingVisit = await Visit.getVisitById(id);
    
    if (!existingVisit) {
      return apiResponse.notFound(res, 'Visit not found');
    }
    
    const visitData = { visit_type, status, doctor_id, notes };
    const updatedVisit = await Visit.updateVisit(id, visitData);
    
    return apiResponse.success(res, { visit: updatedVisit });
  } catch (error) {
    console.error(`Error updating visit with ID ${id}:`, error);
    return apiResponse.error(res, 'Failed to update visit');
  }
};

/**
 * Complete a visit
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.completeVisit = async (req, res) => {
  const { id } = req.params;
  const { diagnosis, treatment, notes } = req.body;
  
  if (!diagnosis || !treatment) {
    return apiResponse.validationError(res, 'Diagnosis and treatment are required');
  }
  
  try {
    // Check if visit exists
    const existingVisit = await Visit.getVisitById(id);
    
    if (!existingVisit) {
      return apiResponse.notFound(res, 'Visit not found');
    }
    
    const completionData = { diagnosis, treatment, notes };
    const completedVisit = await Visit.completeVisit(id, completionData);
    
    return apiResponse.success(res, { visit: completedVisit });
  } catch (error) {
    console.error(`Error completing visit with ID ${id}:`, error);
    return apiResponse.error(res, 'Failed to complete visit');
  }
};

/**
 * Get active visits
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getActiveVisits = async (req, res) => {
  try {
    const visits = await Visit.getActiveVisits();
    return apiResponse.success(res, { visits });
  } catch (error) {
    console.error('Error getting active visits:', error);
    return apiResponse.error(res, 'Failed to retrieve active visits');
  }
};

/**
 * Get visits by date range
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVisitsByDateRange = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return apiResponse.validationError(res, 'Start date and end date are required');
  }
  
  try {
    const visits = await Visit.getVisitsByDateRange(startDate, endDate);
    return apiResponse.success(res, { visits });
  } catch (error) {
    console.error(`Error getting visits between ${startDate} and ${endDate}:`, error);
    return apiResponse.error(res, 'Failed to retrieve visits for date range');
  }
};