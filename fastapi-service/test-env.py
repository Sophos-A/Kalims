import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

print("Environment Variables:")
print(f"PORT: {os.getenv('PORT')}")
print(f"FASTAPI_API_KEY: {os.getenv('FASTAPI_API_KEY')}")
print(f"DEEPSEEK_API_KEY: {os.getenv('DEEPSEEK_API_KEY')}")
print(f"DEEPSEEK_MODEL: {os.getenv('DEEPSEEK_MODEL')}")
print(f"DEEPSEEK_API_BASE: {os.getenv('DEEPSEEK_API_BASE')}")
print(f"AI_SERVICE_TIMEOUT: {os.getenv('AI_SERVICE_TIMEOUT')}")
print(f"AI_TRIAGE_THRESHOLD: {os.getenv('AI_TRIAGE_THRESHOLD')}")
