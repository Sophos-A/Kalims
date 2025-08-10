const { 
    calculateTriageScore, 
    getTriageCategory, 
    calculateEstimatedWaitTime,
    sortQueueByTriageScore
} = require('./triageService');
const db = require('../config/db');

class QueueService {
    constructor() {
        // In-memory storage for queues (in production, this would be a database)
        this.queues = {
            vitals: [],      // First-come-first-serve
            doctor: []       // Sorted by triage score
        };
        this.averageProcessingTimes = {
            vitals: 10,     // 10 minutes per patient for vitals
            doctor: 20       // 20 minutes per patient for doctor consultation
        };
    }

    // Add patient to vitals queue (first-come-first-serve)
    async addToVitalsQueue(patientId, visitId, checkInMethod = 'web') {
        const queueItem = {
            patientId,
            visitId,
            checkInTime: new Date(),
            checkInMethod,
            status: 'waiting',
            position: this.queues.vitals.length + 1
        };

        this.queues.vitals.push(queueItem);
        
        return {
            queueId: queueItem.visitId,
            position: queueItem.position,
            estimatedWaitTime: this.calculateVitalsQueueWaitTime(),
            queueType: 'vitals',
            checkInTime: queueItem.checkInTime
        };
    }

    // Process vitals and move to doctor queue with triage
    async processVitals(visitId, vitalSigns, symptoms) {
        // Find patient in vitals queue
        const vitalsIndex = this.queues.vitals.findIndex(item => item.visitId === visitId);
        if (vitalsIndex === -1) {
            throw new Error('Visit not found in vitals queue');
        }

        const patientData = this.queues.vitals[vitalsIndex];
        
        // Get patient vulnerability factors
        let vulnerabilityFactors = [];
        try {
            const vfResult = await db.query(
                `SELECT vf.name, vf.priority_boost 
                 FROM patients p
                 LEFT JOIN patient_vulnerabilities pv ON p.id = pv.patient_id
                 LEFT JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
                 WHERE p.id = $1`,
                [patientData.patientId]
            );
            vulnerabilityFactors = vfResult.rows.map(row => row.name);
        } catch (err) {
            console.warn('Could not fetch vulnerability factors for patient:', err);
        }
        
        // Calculate triage score and category with vulnerability boosting
        const triageScore = calculateTriageScore(vitalSigns, symptoms, vulnerabilityFactors);
        const triageCategory = getTriageCategory(triageScore);
        
        // Create doctor queue item
        const doctorQueueItem = {
            ...patientData,
            vitalSigns,
            symptoms,
            triageScore,
            triageCategory,
            vitalsCompletedTime: new Date(),
            status: 'waiting_doctor',
            position: this.queues.doctor.length + 1
        };

        // Add to doctor queue
        this.queues.doctor.push(doctorQueueItem);
        
        // Sort doctor queue by triage score (highest first)
        this.queues.doctor = sortQueueByTriageScore(this.queues.doctor);
        
        // Update positions after sorting
        this.queues.doctor.forEach((item, index) => {
            item.position = index + 1;
        });

        // Remove from vitals queue
        this.queues.vitals.splice(vitalsIndex, 1);
        
        // Update positions in vitals queue
        this.queues.vitals.forEach((item, index) => {
            item.position = index + 1;
        });

        return {
            queueId: doctorQueueItem.visitId,
            position: doctorQueueItem.position,
            triageScore,
            triageCategory,
            estimatedWaitTime: this.calculateDoctorQueueWaitTime(doctorQueueItem.patientId),
            queueType: 'doctor'
        };
    }

    // Get queue status for a patient
    async getQueueStatus(visitId) {
        // Check vitals queue
        const inVitalsQueue = this.queues.vitals.find(item => item.visitId === visitId);
        if (inVitalsQueue) {
            return {
                queueType: 'vitals',
                position: inVitalsQueue.position,
                queueLength: this.queues.vitals.length,
                estimatedWaitTime: this.calculateVitalsQueueWaitTime(inVitalsQueue.position),
                status: inVitalsQueue.status,
                checkInTime: inVitalsQueue.checkInTime
            };
        }

        // Check doctor queue
        const inDoctorQueue = this.queues.doctor.find(item => item.visitId === visitId);
        if (inDoctorQueue) {
            return {
                queueType: 'doctor',
                position: inDoctorQueue.position,
                queueLength: this.queues.doctor.length,
                estimatedWaitTime: this.calculateDoctorQueueWaitTime(inDoctorQueue.patientId),
                triageScore: inDoctorQueue.triageScore,
                triageCategory: inDoctorQueue.triageCategory,
                status: inDoctorQueue.status,
                checkInTime: inDoctorQueue.checkInTime
            };
        }

        return null; // Not found in any queue
    }

    // Add appointment to doctor queue with proper prioritization
    async addAppointmentToQueue(appointmentId, patientId, visitId, appointmentDate) {
        try {
            // Get patient information including vulnerabilities
            const patientResult = await db.query(
                `SELECT p.id, p.name, p.dob, p.gender, p.category_id, 
                 pc.name as categoryName,
                 ARRAY_AGG(vf.name) as vulnerabilities
                 FROM patients p
                 LEFT JOIN patient_categories pc ON p.category_id = pc.id
                 LEFT JOIN patient_vulnerabilities pv ON p.id = pv.patient_id
                 LEFT JOIN vulnerability_factors vf ON pv.vulnerability_id = vf.id
                 WHERE p.id = $1
                 GROUP BY p.id, pc.name`,
                [patientId]
            );

            if (patientResult.rows.length === 0) {
                throw new Error('Patient not found');
            }

            const patientData = patientResult.rows[0];
            
            // Get patient vulnerability factors for triage scoring
            let vulnerabilityFactors = [];
            if (patientData.vulnerabilities && patientData.vulnerabilities[0] !== null) {
                vulnerabilityFactors = patientData.vulnerabilities;
            }

            // For appointments, we'll use a high triage score to ensure prioritization
            // Appointments get a score of 0.95 which is above the 0.9 threshold
            const triageScore = 0.95;
            const triageCategory = getTriageCategory(triageScore);

            // Create doctor queue item for appointment
            const appointmentQueueItem = {
                patientId,
                visitId,
                appointmentId, // This identifies the item as an appointment
                patientName: patientData.name,
                categoryName: patientData.categoryName || 'Unknown',
                checkInTime: appointmentDate, // Use appointment date as check-in time
                vitalSigns: {},
                symptoms: {},
                triageScore,
                triageCategory,
                status: 'waiting_doctor',
                position: this.queues.doctor.length + 1
            };

            // Add to doctor queue
            this.queues.doctor.push(appointmentQueueItem);
            
            // Sort doctor queue by triage score (highest first) with appointment prioritization
            this.queues.doctor = sortQueueByTriageScore(this.queues.doctor);
            
            // Update positions after sorting
            this.queues.doctor.forEach((item, index) => {
                item.position = index + 1;
            });

            return appointmentQueueItem;
        } catch (err) {
            console.error('Error adding appointment to queue:', err);
            throw err;
        }
    }

    // Calculate estimated wait time for vitals queue
    calculateVitalsQueueWaitTime(position) {
        const avgTime = this.averageProcessingTimes.vitals;
        return (position - 1) * avgTime; // Simple linear estimation
    }

    // Calculate estimated wait time for doctor queue
    calculateDoctorQueueWaitTime(patientId) {
        const patientIndex = this.queues.doctor.findIndex(p => p.patientId === patientId);
        if (patientIndex === -1) return 0;

        let totalWaitTime = 0;
        const avgTime = this.averageProcessingTimes.doctor;
        
        // Sum up estimated times for patients ahead in queue
        for (let i = 0; i < patientIndex; i++) {
            // Higher priority patients might take longer
            const priorityFactor = 1 + (0.5 * (1 - this.queues.doctor[i].triageScore));
            totalWaitTime += avgTime * priorityFactor;
        }

        return Math.round(totalWaitTime);
    }

    // Get current queue lengths
    getQueueStats() {
        return {
            vitals: {
                length: this.queues.vitals.length,
                estimatedWaitTime: this.calculateVitalsQueueWaitTime(this.queues.vitals.length)
            },
            doctor: {
                length: this.queues.doctor.length,
                estimatedWaitTime: this.calculateDoctorQueueWaitTime(
                    this.queues.doctor[this.queues.doctor.length - 1]?.patientId
                ) || 0
            }
        };
    }
}

// Singleton instance
const queueService = new QueueService();
module.exports = queueService;
