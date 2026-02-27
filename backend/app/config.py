import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta


def _first_env(*keys: str, default: str = "") -> str:
    for key in keys:
        value = os.getenv(key)
        if value is not None and str(value).strip() != "":
            cleaned = str(value).strip().strip('"').strip("'")

            # Recover from accidental dashboard paste: "KEY=value"
            for candidate_key in keys:
                prefix = f"{candidate_key}="
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):].strip()

            if not cleaned.startswith(("mongodb://", "mongodb+srv://")):
                srv_idx = cleaned.find("mongodb+srv://")
                std_idx = cleaned.find("mongodb://")
                idx = srv_idx if srv_idx >= 0 else std_idx
                if idx >= 0:
                    cleaned = cleaned[idx:]

            if cleaned:
                return cleaned
    return default

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

# Database Configuration
# Accept common variable names used by different platforms/integrations.
MONGODB_URL = _first_env(
    "MONGODB_URL",
    "MONGODB_URI",
    "MONGO_URL",
    default="mongodb://localhost:27017",
)
DATABASE_NAME = _first_env(
    "DATABASE_NAME",
    "MONGODB_DATABASE",
    "MONGO_DB_NAME",
    default="text_analyzer",
)

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
    "https://textanalyzerllmagik.vercel.app",
    "https://textanalyzerproject.onrender.com",
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
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://([a-z0-9-]+)\.vercel\.app$"
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

# Single free-provider strategy (recommended for production simplicity)
# Allowed: auto | tesseract | ocr_space
# Default is ocr_space so deployment has one external free provider only.
OCR_PROVIDER = os.getenv("OCR_PROVIDER", "ocr_space")
TESSERACT_LANG = os.getenv("TESSERACT_LANG", "eng")
OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")
OCR_SPACE_LANGUAGE = os.getenv("OCR_SPACE_LANGUAGE", "eng")

# Text provider strategy
# - free_single: deep-translator as primary for translation/paraphrase, LanguageTool public for grammar.
# - local_only: local heuristic/rule-based pipeline only.
TEXT_PROVIDER_MODE = os.getenv("TEXT_PROVIDER_MODE", "free_single").strip().lower()

# OCR history auto-retention (days). Set 0 to disable auto-delete.
try:
    OCR_HISTORY_RETENTION_DAYS = max(0, int(os.getenv("OCR_HISTORY_RETENTION_DAYS", "30")))
except ValueError:
    OCR_HISTORY_RETENTION_DAYS = 30
