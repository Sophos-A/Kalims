import os
import json
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import httpx
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ======================
# 🔐 Security Setup
# ======================
security = HTTPBearer()
INTERNAL_API_KEY = os.getenv("FASTAPI_API_KEY")
if not INTERNAL_API_KEY:
    raise RuntimeError("FASTAPI_API_KEY is not set in environment")

# ======================
# 🧠 AI Configuration (from .env)
# ======================
AI_BASE = os.getenv("DEEPSEEK_API_BASE", "http://91.108.112.45:4000")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "groq/deepseek-r1-distill-llama-70b")
AI_TIMEOUT = int(os.getenv("AI_SERVICE_TIMEOUT", "5000")) / 1000  # Convert ms → seconds

# ======================
# 🚑 Triage Threshold
# ======================
TRIAGE_THRESHOLD = float(os.getenv("AI_TRIAGE_THRESHOLD", "0.7"))

# ======================
# 📦 Logging
# ======================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TriageService")

# ======================
# 🚀 FastAPI App
# ======================
app = FastAPI(
    title="AI-Powered Medical Triage Service",
    description="Secure microservice for patient severity scoring using LLMs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ======================
# 🔐 Internal Auth Dependency
# ======================
def verify_internal_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing internal API key"
        )
    return credentials.credentials

# ======================
# 🧩 Request/Response Models
# ======================
class TriageInput(BaseModel):
    symptoms: str = Field(..., min_length=1, description="Patient-reported symptoms")
    vitals: Optional[Dict[str, Any]] = Field(None, description="Vital signs (e.g. BP, HR, Temp)")

class TriageOutput(BaseModel):
    severityScore: float = Field(..., ge=0.0, le=1.0, description="Urgency score (0.0 to 1.0)")
    recommendedAction: str = Field(..., description="Suggested clinical action")
    criticalFlags: List[str] = Field(default_factory=list, description="Detected red-flag symptoms")
    rawResponse: str = Field(..., description="Raw LLM output for auditing")

# ======================
# 🟢 Health Check Endpoint
# ======================
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "ai-triage-microservice",
        "ai_model": DEEPSEEK_MODEL,
        "ai_endpoint": AI_BASE,
        "triage_threshold": TRIAGE_THRESHOLD,
        "timestamp": __import__('datetime').datetime.utcnow().isoformat() + "Z"
    }

# ======================
# 🤖 Triage Endpoint
# ======================
@app.post("/triage", response_model=TriageOutput, tags=["Triage"])
async def run_triage(
    data: TriageInput,
    api_key: str = Depends(verify_internal_api_key)
):
    """
    Accept patient symptoms and vitals, query AI model, return structured triage result.
    Called by Node.js backend with internal API key.
    """
    try:
        # 🧠 Construct prompt for AI
        system_prompt = """
You are a medical triage AI assistant. Analyze the patient's symptoms and vitals to determine clinical urgency.
Respond ONLY in valid JSON with these fields:
{
  "severityScore": float (0.0 to 1.0, where 1.0 is critical),
  "recommendedAction": string (e.g., "Immediate ER", "See within 30 mins", "Routine care"),
  "criticalFlags": array of strings (e.g., ["Chest pain", "Difficulty breathing"])
}

Rules:
- Be conservative: when in doubt, err on the side of urgency.
- Use only the information provided.
- Do not ask for more data — make best assessment.
"""

        user_prompt = f"Symptoms: {data.symptoms}. Vitals: {data.vitals or 'Not provided'}."

        # 🚀 Call DeepSeek via LiteLLM endpoint
        async with httpx.AsyncClient(timeout=httpx.Timeout(AI_TIMEOUT)) as client:
            response = await client.post(
                f"{AI_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                }
            )

        # Check for HTTP errors
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"AI service error: {response.text}"
            )

        # Parse LLM response
        llm_output = response.json()
        raw_content = llm_output["choices"][0]["message"]["content"].strip()

        # Try to extract JSON from response (LLM may add text)
        try:
            # Remove markdown or extra text
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:raw_content.rfind("```")]
            elif raw_content.startswith("{") and raw_content.endswith("}"):
                pass
            else:
                # Fallback: extract JSON block
                start = raw_content.find("{")
                end = raw_content.rfind("}") + 1
                if start == -1 or end == 0:
                    raise ValueError("No JSON found")
                raw_content = raw_content[start:end]

            ai_result = json.loads(raw_content)

            # Validate required fields
            required_keys = ["severityScore", "recommendedAction", "criticalFlags"]
            for key in required_keys:
                if key not in ai_result:
                    raise ValueError(f"Missing key in AI response: {key}")

            # Clamp severity score
            severity = max(0.0, min(1.0, float(ai_result["severityScore"])))

            logger.info(f"Triage completed | Score: {severity} | Flags: {ai_result['criticalFlags']}")

            return {
                "severityScore": severity,
                "recommendedAction": str(ai_result["recommendedAction"]),
                "criticalFlags": [str(f) for f in ai_result["criticalFlags"]],
                "rawResponse": raw_content
            }

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse AI response: {e} | Raw: {raw_content}")
            # Fallback logic based on keywords
            lower_text = raw_content.lower()
            if any(word in lower_text for word in ["chest pain", "difficulty breathing", "unconscious", "severe"]):
                return TriageOutput(
                    severityScore=0.9,
                    recommendedAction="Immediate medical attention required",
                    criticalFlags=["High-risk symptom detected (AI parsing failed)"],
                    rawResponse=raw_content
                )
            else:
                return TriageOutput(
                    severityScore=0.4,
                    recommendedAction="Assessment unclear - manual review recommended",
                    criticalFlags=[],
                    rawResponse=raw_content
                )

    except httpx.TimeoutException:
        logger.error("AI service timed out")
        raise HTTPException(status_code=504, detail="AI service timed out")

    except httpx.RequestError as e:
        logger.error(f"Request error: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to reach AI service: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected error in triage: {e}")
        raise HTTPException(status_code=500, detail="Internal triage service error")

# ======================
# 🧪 Example Endpoint (for testing)
# ======================
@app.post("/triage/mock", response_model=TriageOutput, tags=["Testing"])
async def mock_triage(data: TriageInput):
    """
    Mock endpoint for testing without calling external AI.
    """
    symptoms = data.symptoms.lower()
    flags = []
    if "chest" in symptoms or "heart" in symptoms:
        flags.append("Chest pain")
    if "breath" in symptoms or "shortness" in symptoms:
        flags.append("Difficulty breathing")
    if "fever" in symptoms:
        flags.append("Fever")

    score = min(0.9, 0.3 + (len(flags) * 0.3))

    return TriageOutput(
        severityScore=round(score, 3),
        recommendedAction="See within 30 minutes" if score >= 0.7 else "Routine care advised",
        criticalFlags=flags,
        rawResponse=json.dumps({
            "severityScore": score,
            "recommendedAction": "See within 30 minutes",
            "criticalFlags": flags
        })
    )