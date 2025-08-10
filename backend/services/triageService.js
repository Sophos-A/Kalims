const TRIAGE_WEIGHTS = {
    // Vital signs weights (0-1 scale)
    vitalSigns: {
        temperature: 0.2,
        heartRate: 0.2,
        bloodPressure: 0.25,
        respiratoryRate: 0.15,
        oxygenSaturation: 0.2
    },
    // Symptom weights (0-1 scale)
    symptoms: {
        painLevel: 0.3,
        difficultyBreathing: 0.3,
        chestPain: 0.25,
        alteredMentalStatus: 0.15
    },
    // Triage categories and their score ranges
    categories: {
        immediate: { min: 0.8, max: 1.0 },
        emergency: { min: 0.6, max: 0.79 },
        urgent: { min: 0.3, max: 0.59 },
        lessUrgent: { min: 0.1, max: 0.29 },
        nonUrgent: { min: 0, max: 0.09 }
    }
};

// Vulnerability boost factors (defined in database)
const VULNERABILITY_BOOSTS = {
    'elderly': 0.15,
    'wheelchair_user': 0.1,
    'urgent_referral': 0.2,
    'chronic_condition': 0.1,
    'immunocompromised': 0.12
};

// Calculate triage score based on vital signs and symptoms
function calculateTriageScore(vitalSigns, symptoms, vulnerabilityFactors = []) {
    let score = 0;
    
    // Calculate vital signs component (50% of total score)
    const vitalScore = calculateVitalSignsScore(vitalSigns);
    
    // Calculate symptoms component (50% of total score)
    const symptomScore = calculateSymptomsScore(symptoms);
    
    // Combine scores with weights
    score = (vitalScore * 0.5) + (symptomScore * 0.5);
    
    // Apply vulnerability boosts
    let boost = 0;
    if (vulnerabilityFactors && Array.isArray(vulnerabilityFactors)) {
        vulnerabilityFactors.forEach(factor => {
            if (VULNERABILITY_BOOSTS[factor]) {
                boost += VULNERABILITY_BOOSTS[factor];
            }
        });
    }
    
    // Apply boost (capped at 1.0)
    score = Math.min(score + boost, 1);
    
    return Math.min(Math.max(score, 0), 1); // Ensure score is between 0 and 1
}

function calculateVitalSignsScore(vitalSigns) {
    let score = 0;
    const { temperature, heartRate, bloodPressure, respiratoryRate, oxygenSaturation } = vitalSigns;
    const weights = TRIAGE_WEIGHTS.vitalSigns;
    
    // Temperature score (0-1, higher is more critical)
    if (temperature >= 39 || temperature <= 35) score += 1 * weights.temperature;
    else if (temperature >= 38 || temperature <= 36) score += 0.5 * weights.temperature;
    
    // Heart rate score
    if (heartRate >= 130 || heartRate <= 50) score += 1 * weights.heartRate;
    else if (heartRate >= 110 || heartRate <= 60) score += 0.7 * weights.heartRate;
    else if (heartRate >= 100 || heartRate <= 70) score += 0.3 * weights.heartRate;
    
    // Blood pressure score (using systolic BP)
    const systolicBP = parseInt(bloodPressure.split('/')[0]);
    if (systolicBP >= 180 || systolicBP <= 90) score += 1 * weights.bloodPressure;
    else if (systolicBP >= 160 || systolicBP <= 100) score += 0.7 * weights.bloodPressure;
    else if (systolicBP >= 140 || systolicBP <= 110) score += 0.3 * weights.bloodPressure;
    
    // Respiratory rate score
    if (respiratoryRate >= 30 || respiratoryRate <= 8) score += 1 * weights.respiratoryRate;
    else if (respiratoryRate >= 25 || respiratoryRate <= 10) score += 0.7 * weights.respiratoryRate;
    else if (respiratoryRate >= 20 || respiratoryRate <= 12) score += 0.3 * weights.respiratoryRate;
    
    // Oxygen saturation score
    if (oxygenSaturation < 90) score += 1 * weights.oxygenSaturation;
    else if (oxygenSaturation < 94) score += 0.5 * weights.oxygenSaturation;
    
    return score;
}

function calculateSymptomsScore(symptoms) {
    let score = 0;
    const { painLevel, difficultyBreathing, chestPain, alteredMentalStatus } = symptoms;
    const weights = TRIAGE_WEIGHTS.symptoms;
    
    // Pain level (0-10 scale, converted to 0-1)
    score += (painLevel / 10) * weights.painLevel;
    
    // Difficulty breathing (0-1 scale)
    if (difficultyBreathing) score += 1 * weights.difficultyBreathing;
    
    // Chest pain (0-1 scale)
    if (chestPain) score += 1 * weights.chestPain;
    
    // Altered mental status (0-1 scale)
    if (alteredMentalStatus) score += 1 * weights.alteredMentalStatus;
    
    return score;
}

// Determine triage category based on score
function getTriageCategory(score) {
    for (const [category, range] of Object.entries(TRIAGE_WEIGHTS.categories)) {
        if (score >= range.min && score <= range.max) {
            return category;
        }
    }
    return 'nonUrgent'; // Default category
}

// Calculate estimated wait time based on triage category and queue length
function calculateEstimatedWaitTime(triageCategory, queueLength, averageProcessingTime = 15) {
    // Base wait times in minutes for each category
    const baseWaitTimes = {
        immediate: 0,    // Seen immediately
        emergency: 5,    // 5 minutes
        urgent: 15,      // 15 minutes
        lessUrgent: 30,  // 30 minutes
        nonUrgent: 60    // 60 minutes
    };
    
    // Calculate queue-based wait time
    const queueWaitTime = queueLength * averageProcessingTime;
    
    // Combine base wait time with queue-based wait time
    return baseWaitTimes[triageCategory] + queueWaitTime;
}

// Sort patients in the queue based on triage score (highest score first)
// Appointments are prioritized above all patients with triage score < 0.9
function sortQueueByTriageScore(queue) {
    return [...queue].sort((a, b) => {
        // Check if either patient is an appointment
        const aIsAppointment = a.hasOwnProperty('appointmentId') || a.hasOwnProperty('isAppointment');
        const bIsAppointment = b.hasOwnProperty('appointmentId') || b.hasOwnProperty('isAppointment');
        
        // If both are appointments or both are regular patients, sort by triage score
        if ((aIsAppointment && bIsAppointment) || (!aIsAppointment && !bIsAppointment)) {
            return b.triageScore - a.triageScore;
        }
        
        // If only A is an appointment, A comes first if B's score is < 0.9
        if (aIsAppointment && !bIsAppointment) {
            return b.triageScore < 0.9 ? -1 : 1;
        }
        
        // If only B is an appointment, B comes first if A's score is < 0.9
        if (bIsAppointment && !aIsAppointment) {
            return a.triageScore < 0.9 ? 1 : -1;
        }
        
        // Default sorting by triage score
        return b.triageScore - a.triageScore;
    });
}

module.exports = {
    calculateTriageScore,
    getTriageCategory,
    calculateEstimatedWaitTime,
    sortQueueByTriageScore
};
