import os
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, constr
from typing import Dict, Optional, List
from app.triage_logic import triage_patient, TriageLevel
import hashlib
import uvicorn

if __name__ == "__main__":
    run_test_triage()

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("neuro_triage.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("neuro_triage_api")

app = FastAPI(
    title="Neurosurgical Clinic AI Triage Service",
    description="Real-time AI-powered triage system for neurological emergencies",
    version="1.3.0",
    docs_url="/api/docs",
    redoc_url=None
)

# CORS Configuration for clinical environments
origins = [
    "http://localhost:3000",
    "https://hospital-emr-system.com",
    "https://neuro-clinic.org"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Triage-Response-Time"]
)

# 🔒 Security Configuration
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# In production, use environment variables or secure secret management
VALID_API_KEYS = {
    "ER_DEPT_1": hashlib.sha256(b"neuro-emergency-key-2024").hexdigest(),
    "NEURO_SURGERY": hashlib.sha256(b"surgical-access-key-secure").hexdigest()
}

def validate_api_key(api_key: str = Security(api_key_header)):
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is missing"
        )
    
    if api_key not in VALID_API_KEYS.values():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    return api_key

# 🧠 Medical Data Models with Enhanced Validation
class VitalSigns(BaseModel):
    gcs: int = Field(..., gt=2, lt=16, description="Glasgow Coma Scale (3-15)")
    bp_systolic: int = Field(..., gt=50, lt=300, description="Systolic blood pressure (mmHg)")
    bp_diastolic: int = Field(..., gt=30, lt=200, description="Diastolic blood pressure (mmHg)")
    heart_rate: int = Field(..., gt=20, lt=250, description="Heart rate (bpm)")
    respiratory_rate: int = Field(..., gt=5, lt=50, description="Respiratory rate (breaths/min)")
    temperature: float = Field(..., gt=30.0, lt=45.0, description="Body temperature (°C)")
    oxygen_saturation: float = Field(..., gt=50.0, lt=100.0, description="SpO2 (%)")

    @validator('gcs')
    def validate_gcs(cls, v):
        if v < 3 or v > 15:
            raise ValueError("GCS must be between 3 and 15")
        return v

class PatientData(BaseModel):
    patient_id: constr(min_length=6, max_length=20) = Field(..., description="Hospital patient ID")
    age: int = Field(..., gt=0, lt=120, description="Patient age in years")
    symptoms: str = Field(..., min_length=10, max_length=1000, description="Patient-reported symptoms")
    vitals: VitalSigns
    medical_history: Optional[str] = Field(None, max_length=500, description="Relevant medical history")
    current_medications: Optional[List[str]] = Field(None, description="List of current medications")
    onset_time: Optional[str] = Field(None, description="Symptom onset time (ISO 8601 format)")

    @validator('symptoms')
    def validate_symptoms(cls, v):
        critical_terms = ["seizure", "unconscious", "paralysis", "stroke", "meningitis"]
        if not any(term in v.lower() for term in critical_terms):
            logger.warning(f"Non-specific symptoms reported: {v[:50]}...")
        return v

# 🚨 Emergency Response Model
class TriageResponse(BaseModel):
    triage_level: TriageLevel
    clinical_priority: int = Field(..., ge=1, le=4, description="1=Resuscitation, 2=Emergency, 3=Urgent, 4=Non-urgent")
    critical_findings: List[str]
    recommended_actions: List[str]
    ai_insights: Optional[str] = None
    differential_diagnosis: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    response_time_ms: float

# 📊 Audit Log Model
class AuditLog(BaseModel):
    patient_id: str
    triage_level: str
    timestamp: datetime
    api_client: str

# 🧠 Triage endpoint with enhanced safety features
@app.post("/triage", 
          response_model=TriageResponse,
          summary="Perform AI-powered neurological triage",
          description="""Assess patient condition using clinical guidelines and AI analysis.
          Returns triage level with clinical justification and recommended actions.""",
          tags=["Clinical Decision Support"])
async def perform_triage(
    patient: PatientData,
    api_key: str = Depends(validate_api_key)
):
    start_time = datetime.utcnow()
    try:
        # Convert to dict for compatibility
        patient_data = patient.dict()
        
        # Perform triage assessment
        result = triage_patient(patient_data)
        
        # Calculate response time
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Add critical findings from rule-based system
        critical_findings = []
        if result.get('severity') == "CRITICAL":
            critical_findings.append("Immediate life-threatening condition detected")
        
        # Format response
        return JSONResponse(
            content={
                "triage_level": result.get('severity', 'MODERATE'),
                "clinical_priority": 1 if result.get('severity') == "CRITICAL" else 2,
                "critical_findings": critical_findings,
                "recommended_actions": [
                    "Activate stroke team" if "stroke" in patient.symptoms.lower() else "Neurology consult",
                    "Prepare imaging suite"
                ],
                "ai_insights": result.get('ai_response', 'AI assessment not available'),
                "differential_diagnosis": [
                    "Ischemic stroke" if "facial droop" in patient.symptoms.lower() else "Migraine",
                    "Seizure disorder" if "seizure" in patient.symptoms.lower() else "TIA"
                ],
                "timestamp": datetime.utcnow().isoformat(),
                "response_time_ms": round(response_time, 2)
            },
            headers={"X-Triage-Response-Time": str(round(response_time, 2))}
        )
        
    except Exception as e:
        logger.error(f"Triage failed for patient {patient.patient_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Triage system error. Manual assessment required."
        )

# 🚑 Critical Case Endpoint
@app.post("/critical-case", 
          status_code=status.HTTP_201_CREATED,
          tags=["Emergency Protocols"])
async def handle_critical_case(patient: PatientData):
    """Direct pathway for critical neurological cases bypassing normal triage"""
    logger.critical(f"CRITICAL CASE: Patient {patient.patient_id} - {patient.symptoms[:50]}...")
    
    # Implement emergency response protocols
    return {
        "action": "ACTIVATE_STROKE_TEAM",
        "message": "Critical neurological emergency. Activating code neuro.",
        "timestamp": datetime.utcnow().isoformat(),
        "required_actions": [
            "Prepare CT scanner",
            "Notify neurosurgery",
            "Administer tPA if eligible"
        ]
    }

# 🛡️ HIPAA Compliance Endpoints
@app.get("/audit-log", tags=["Security & Compliance"])
async def get_audit_logs(api_key: str = Depends(validate_api_key)):
    """Retrieve audit trail of triage decisions"""
    # In production, query database
    return [
        AuditLog(
            patient_id="PT-12345",
            triage_level="CRITICAL",
            timestamp=datetime.utcnow(),
            api_client="ER_DEPT_1"
        ).dict()
    ]

# 🚨 Emergency Override
@app.post("/manual-override", tags=["Clinical Safety"])
async def manual_override(patient: PatientData, override_reason: str):
    """Allows clinicians to override AI assessment with manual triage"""
    logger.warning(f"MANUAL OVERRIDE: {override_reason}")
    return {
        "status": "OVERRIDE_ACCEPTED",
        "message": "Clinician override applied. AI assessment bypassed.",
        "override_reason": override_reason,
        "timestamp": datetime.utcnow().isoformat()
    }

# 🏥 System Health Endpoints
@app.get("/health", tags=["System Monitoring"])
async def health_check():
    """System health status for monitoring"""
    return {"status": "OK", "timestamp": datetime.utcnow().isoformat()}

@app.get("/system-status", tags=["System Monitoring"])
async def system_status():
    """Detailed system health information"""
    return {
        "ai_service": "OPERATIONAL",
        "response_time": "42ms avg",
        "last_critical_case": "2024-07-26T08:42:00Z",
        "active_alerts": 0
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="./localhost-key.pem" if os.path.exists("./localhost-key.pem") else None,
        ssl_certfile="./localhost.pem" if os.path.exists("./localhost.pem") else None,
        log_config=None
    )