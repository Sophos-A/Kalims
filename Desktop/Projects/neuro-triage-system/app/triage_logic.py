import openai
from app.config import get_config

config = get_config()
openai.api_key = config.OPENAI_API_KEY

# Sample keywords to determine critical symptoms (you can customize this)
CRITICAL_SYMPTOMS = ["seizure", "loss of consciousness", "paralysis", "severe headache", "coma"]

def is_critical_vitals(vitals: dict, critical_ranges: dict) -> bool:
    for key, value in vitals.items():
        if key in critical_ranges:
            high, low = critical_ranges[key]
            if high and value > high:
                return True
            if low and value < low:
                return True
    return False

def analyze_symptoms(symptoms: str) -> bool:
    """Basic symptom keyword matching."""
    symptoms_lower = symptoms.lower()
    return any(critical in symptoms_lower for critical in CRITICAL_SYMPTOMS)

def ai_triage_assessment(symptoms: str, vitals: dict, history: str = "") -> str:
    """Use OpenAI to assess patient triage severity based on input."""
    prompt = (
        f"You are a neurosurgical triage assistant. Analyze the following:\n"
        f"Symptoms: {symptoms}\n"
        f"Vitals: {vitals}\n"
        f"History: {history}\n"
        f"Decide if the case is LOW, MODERATE, or HIGH priority and explain briefly why."
    )

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",  # or "gpt-3.5-turbo"
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200
        )
        return response.choices[0].message["content"].strip()
    except Exception as e:
        return f"AI assessment failed: {str(e)}"

def triage_patient(data: dict) -> dict:
    severity = "LOW"
    explanation = ""

    if analyze_symptoms(data["symptoms"]) or is_critical_vitals(data["vitals"], config.CRITICAL_VITALS):
        severity = "HIGH"
        explanation = "Critical symptoms or vital signs detected."

    # Try AI-enhanced triage if AI key is present
    if config.OPENAI_API_KEY:
        ai_response = ai_triage_assessment(data["symptoms"], data["vitals"], data.get("history", ""))
        return {
            "severity": "AI-Assessed",
            "ai_response": ai_response,
            "raw_input": data
        }

    return {
        "severity": severity,
        "explanation": explanation,
        "raw_input": data
    }
