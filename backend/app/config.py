import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

# Database Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "text_analyzer")

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Application Configuration
APP_NAME = "TextAnalyzer API"
APP_VERSION = "0.0.1"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

DEFAULT_ALLOWED_ORIGINS = ",".join([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
])

_allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in _allowed_origins_raw.split(",")
    if origin.strip()
]

# Helpful in local development when frontend may run on different localhost ports.
ALLOWED_ORIGIN_REGEX = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
)

# File Upload Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

# API Rate Limiting
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_PERIOD = timedelta(hours=1)

# Batch Processing
MAX_BATCH_SIZE = 5
BATCH_TIMEOUT = 300  # 5 minutes

# OCR Configuration
OCR_PROVIDER = os.getenv("OCR_PROVIDER", "auto")  # auto | tesseract | ocr_space
TESSERACT_LANG = os.getenv("TESSERACT_LANG", "eng")
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")
OCR_SPACE_LANGUAGE = os.getenv("OCR_SPACE_LANGUAGE", "eng")

# OCR history auto-retention (days). Set 0 to disable auto-delete.
try:
    OCR_HISTORY_RETENTION_DAYS = max(0, int(os.getenv("OCR_HISTORY_RETENTION_DAYS", "30")))
except ValueError:
    OCR_HISTORY_RETENTION_DAYS = 30
