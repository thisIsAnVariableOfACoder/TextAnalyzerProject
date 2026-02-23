import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

# Database Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "text_analyzer")

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# API Keys
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
LANGUAGE_TOOL_API_KEY = os.getenv("LANGUAGE_TOOL_API_KEY", "")
GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")

# Application Configuration
APP_NAME = "TextAnalyzer API"
APP_VERSION = "0.0.1"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

# File Upload Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

# API Rate Limiting
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_PERIOD = timedelta(hours=1)

# Batch Processing
MAX_BATCH_SIZE = 5
BATCH_TIMEOUT = 300  # 5 minutes

# External API Endpoints
MISTRAL_OCR_API = "https://api.mistral.ai/v1/ocr"
LANGUAGE_TOOL_API = "https://api.languagetoolplus.com"
GOOGLE_TRANSLATE_API = "https://translate.googleapis.com"
MISTRAL_CHAT_API = "https://api.mistral.ai/v1/chat/completions"
