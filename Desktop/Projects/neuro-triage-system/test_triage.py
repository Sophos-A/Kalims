# test_triage.py
from app.config import get_config
import random

config = get_config()

# Mock patient generator
def generate_mock_patient():
    vitals = {
        "bp_sys": random.randint(80, 200),
        "bp_dia": random.randint(50, 120),
        "hr": random.randint(40, 150),
        "o2_sat": random.randint(85, 100),
        "temp": round(random.uniform(35.0, 40.0), 1)
    }
    
    symptoms = [
        "headache", "nausea", "dizziness", "blurred vision",
        "numbness", "confusion", "seizure", "loss of balance"
    ]
    
    return {
        "id": random.randint(1000, 9999),
        "name": f"Patient_{random.randint(1, 100)}",
        "vitals": vitals,
        "symptoms": random.sample(symptoms, random.randint(1, config.MAX_SYMPTOM_COUNT)),
        "timestamp": "2023-07-26T12:00:00Z"
    }

# Generate test patients
test_patients = [generate_mock_patient() for _ in range(5)]

# test_triage.py (continued)
def check_critical_vitals(vitals):
    """Check if vitals exceed critical thresholds"""
    critical = False
    for key, (high, low) in config.CRITICAL_VITALS.items():
        value = vitals.get(key)
        if value:
            if (high and value > high) or (low and value < low):
                print(f"🚨 CRITICAL {key.upper()}: {value} (Normal: {low}-{high})")
                critical = True
    return critical

def ai_triage_assessment(patient):
    """Simulate AI severity scoring (replace with actual OpenAI call later)"""
    symptom_count = len(patient["symptoms"])
    severity = min(0.9, symptom_count * 0.15 + random.random() * 0.2)
    
    # Simulate critical symptom detection
    if "seizure" in patient["symptoms"] or "loss of consciousness" in patient["symptoms"]:
        severity = max(severity, 0.95)
    
    return round(severity, 2)

def process_triage(patient):
    """Full triage processing pipeline"""
    print(f"\n🔍 Assessing {patient['name']} [{patient['id']}]")
    print(f"⚕️ Symptoms: {', '.join(patient['symptoms'])}")
    print(f"📊 Vitals: {patient['vitals']}")
    
    # Step 1: Critical vital check
    if check_critical_vitals(patient["vitals"]):
        return {"priority": "CRITICAL", "wait_time": 0, "severity": 1.0}
    
    # Step 2: AI severity assessment
    severity = ai_triage_assessment(patient)
    print(f"📈 AI Severity: {severity:.2f}")
    
    # Step 3: Priority assignment
    if severity >= config.TRIAGE_THRESHOLD:
        return {"priority": "HIGH", "wait_time": 30, "severity": severity}
    else:
        return {"priority": "LOW", "wait_time": config.DEFAULT_WAIT_TIME, "severity": severity}

# Run triage on test patients
for patient in test_patients:
    result = process_triage(patient)
    print(f"✅ Priority: {result['priority']} | Max Wait: {result['wait_time']} mins\n")