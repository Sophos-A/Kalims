# app/config.py
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class for the Neuro-Triage System."""
    # General settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')  # For JWT or session security
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')  # development, production
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')  # DEBUG, INFO, WARNING, ERROR
    LOG_FILE = os.getenv('LOG_FILE', 'neuro_triage.log')  # Log file path

    # Triage system settings
    TRIAGE_THRESHOLD = float(os.getenv('TRIAGE_THRESHOLD', 0.7))  # Severity score threshold for priority escalation
    MAX_SYMPTOM_COUNT = int(os.getenv('MAX_SYMPTOM_COUNT', 10))  # Max symptoms per patient
    CRITICAL_VITALS = {
        "bp_sys": (float(os.getenv('BP_SYS_HIGH', 180)), float(os.getenv('BP_SYS_LOW', 90))),
        "bp_dia": (float(os.getenv('BP_DIA_HIGH', 120)), float(os.getenv('BP_DIA_LOW', 50))),
        "hr": (float(os.getenv('HR_HIGH', 140)), float(os.getenv('HR_LOW', 40))),
        "o2_sat": (None, float(os.getenv('O2_SAT_LOW', 90))),
        "temp": (float(os.getenv('TEMP_HIGH', 39.0)), float(os.getenv('TEMP_LOW', 35.0)))
    }

    # Service settings (for email and alert services)
    EMAIL_SERVICE_URL = os.getenv('EMAIL_SERVICE_URL', 'https://api.email-service.com/send')
    EMAIL_API_KEY = os.getenv('EMAIL_API_KEY', '')
    ALERT_SERVICE_URL = os.getenv('ALERT_SERVICE_URL', 'https://api.alert-service.com/notify')
    ALERT_API_KEY = os.getenv('ALERT_API_KEY', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')  

    # Database settings (placeholder until database is ready)
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///neuro_triage.db')

    # Queue settings
    MAX_QUEUE_SIZE = int(os.getenv('MAX_QUEUE_SIZE', 100))  # Max patients in queue
    DEFAULT_WAIT_TIME = int(os.getenv('DEFAULT_WAIT_TIME', 240))  # Default wait time in minutes for low priority

class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///neuro_triage_dev.db')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')  # More verbose logging in development

class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///neuro_triage.db')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

def get_config():
    """Return the appropriate configuration based on ENVIRONMENT."""
    env = os.getenv('ENVIRONMENT', 'development').lower()
    if env == 'production':
        return ProductionConfig()
    return DevelopmentConfig()