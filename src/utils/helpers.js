// src/utils/helpers.js
const calculateWaitTime = (position, avgConsultationTime = 5) => {
    return position * avgConsultationTime;
  };
  
  const generateHospitalId = () => {
    const prefix = 'KBTH-NS-';
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return prefix + randomNum;
  };
  
  module.exports = {
    calculateWaitTime,
    generateHospitalId
  };