from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from datetime import datetime
from bson.objectid import ObjectId
from app.models import OCRRequest, OCRResponse, OCRProcessingType
from app.services.ocr_service import OCRService
from app.database import get_database
from app.auth.jwt_handler import JWTHandler, extract_token_from_header
from pymongo.database import Database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["OCR"])
security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthCredentials = Depends(security), db: Database = Depends(get_database)):
    """Dependency to verify authentication"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    token = credentials.credentials
    payload = JWTHandler.verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get('user_id')
    user = db.users.find_one({'_id': ObjectId(user_id)})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user

@router.post("/process", response_model=OCRResponse)
async def process_ocr(
    ocr_request: OCRRequest,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Process image for OCR text extraction"""
    try:
        # Route based on processing type
        if ocr_request.processing_type == OCRProcessingType.URL:
            if not ocr_request.image_url:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="URL required for URL type processing"
                )
            result = OCRService.process_image_url(ocr_request.image_url)

        else:
            # Handle base64 data
            if not ocr_request.image_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image data required"
                )

            import base64
            try:
                image_bytes = base64.b64decode(ocr_request.image_data)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid base64 image data"
                )

            # Validate image
            OCRService.validate_image(image_bytes)

            result = OCRService.process_image_file(image_bytes)

        # Save to processing history
        history_item = {
            'user_id': current_user['_id'],
            'type': 'ocr',
            'input_text': result['extracted_text'][:100],
            'output_text': result['extracted_text'],
            'image_url': ocr_request.image_url,
            'confidence_score': result['confidence_score'],
            'processing_time_ms': result['processing_time_ms'],
            'created_at': datetime.utcnow(),
            'is_exported': False
        }

        db.processing_history.insert_one(history_item)

        return {
            'extracted_text': result['extracted_text'],
            'confidence_score': result['confidence_score'],
            'processing_time_ms': result['processing_time_ms'],
            'image_dimensions': result['image_dimensions'],
            'processing_type': ocr_request.processing_type
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Upload and process image file"""
    try:
        # Read file
        contents = await file.read()

        # Validate image
        OCRService.validate_image(contents)

        # Process OCR
        result = OCRService.process_image_file(contents, file.content_type)

        # Save to processing history
        history_item = {
            'user_id': current_user['_id'],
            'type': 'ocr',
            'input_text': result['extracted_text'][:100],
            'output_text': result['extracted_text'],
            'image_url': f"file://{file.filename}",
            'confidence_score': result['confidence_score'],
            'processing_time_ms': result['processing_time_ms'],
            'created_at': datetime.utcnow(),
            'is_exported': False
        }

        db.processing_history.insert_one(history_item)

        return {
            'extracted_text': result['extracted_text'],
            'confidence_score': result['confidence_score'],
            'processing_time_ms': result['processing_time_ms'],
            'image_dimensions': result['image_dimensions']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload OCR error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
