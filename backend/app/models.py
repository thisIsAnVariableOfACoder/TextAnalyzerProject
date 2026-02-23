from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============ Authentication Models ============

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    email: Optional[EmailStr] = None

    @validator('username')
    def username_alphanumeric(cls, v):
        assert v.isalnum(), 'must be alphanumeric'
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    email: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenRefresh(BaseModel):
    refresh_token: str

# ============ OCR Models ============

class OCRProcessingType(str, Enum):
    UPLOAD = "upload"
    URL = "url"
    CAMERA = "camera"
    CLIPBOARD = "clipboard"

class OCRRequest(BaseModel):
    image_data: str  # base64 encoded
    processing_type: OCRProcessingType
    image_url: Optional[str] = None  # For URL type

class OCRResponse(BaseModel):
    extracted_text: str
    confidence_score: float
    processing_time_ms: float
    image_dimensions: dict
    processing_type: str

class OCRHistoryItem(BaseModel):
    id: str = Field(alias="_id")
    extracted_text: str
    confidence_score: float
    image_url: str
    processing_type: str
    created_at: datetime

# ============ Text Processing Models ============

class ProcessingType(str, Enum):
    GRAMMAR = "grammar"
    PARAPHRASE = "paraphrase"
    TRANSLATE = "translate"

class GrammarCheckRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)
    language: str = "en"

class GrammarCheckResponse(BaseModel):
    original_text: str
    suggestions: List[dict]
    corrected_text: str
    issues_found: int

class ParaphraseRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)
    style: Optional[str] = "normal"  # normal, formal, casual

class ParaphraseResponse(BaseModel):
    original_text: str
    paraphrased_text: str
    alternatives: List[str]

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    source_language: str = "auto"
    target_language: str

class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    detected_language: Optional[str] = None

# ============ Processing History Models ============

class ProcessingHistoryType(str, Enum):
    OCR = "ocr"
    GRAMMAR = "grammar"
    PARAPHRASE = "paraphrase"
    TRANSLATE = "translate"

class ProcessingHistory(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    type: ProcessingHistoryType
    input_text: str
    output_text: str
    input_language: Optional[str] = None
    output_language: Optional[str] = None
    image_url: Optional[str] = None
    confidence_score: Optional[float] = None
    processing_time_ms: float
    created_at: datetime
    is_exported: bool = False

class HistoryQueryParams(BaseModel):
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    type: Optional[ProcessingHistoryType] = None
    search: Optional[str] = None

# ============ Batch Processing Models ============

class BatchProcessingRequest(BaseModel):
    items: List[dict]  # List of OCR or text processing requests
    processing_type: ProcessingType

class BatchProcessingResponse(BaseModel):
    batch_id: str
    total_items: int
    successful: int
    failed: int
    results: List[dict]
    processing_time_ms: float

# ============ Export Models ============

class ExportFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"

class ExportRequest(BaseModel):
    history_id: str
    format: ExportFormat

class ExportResponse(BaseModel):
    file_url: str
    filename: str
    format: str
    size_bytes: int
    created_at: datetime

# ============ Error Models ============

class ErrorResponse(BaseModel):
    error: str
    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
