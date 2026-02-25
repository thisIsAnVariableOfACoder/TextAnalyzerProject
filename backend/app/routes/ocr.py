from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from bson.objectid import ObjectId
from app.models import OCRRequest, OCRResponse, OCRProcessingType
from app.services.ocr_service import OCRService
from app.database import get_database
from app.auth.jwt_handler import JWTHandler
from app.config import OCR_HISTORY_RETENTION_DAYS
from pymongo.database import Database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["OCR"])
security = HTTPBearer(auto_error=False)


def _cleanup_expired_ocr_history(db: Database, user_id) -> int:
    """Delete OCR history older than configured retention window for current user."""
    if OCR_HISTORY_RETENTION_DAYS <= 0:
        return 0

    cutoff = datetime.utcnow() - timedelta(days=OCR_HISTORY_RETENTION_DAYS)
    result = db.processing_history.delete_many({
        'user_id': user_id,
        'type': 'ocr',
        'created_at': {'$lt': cutoff}
    })
    return result.deleted_count


def _build_ocr_history_item(current_user, result: dict, image_url: str | None):
    now = datetime.utcnow()
    item = {
        'user_id': current_user['_id'],
        'type': 'ocr',
        'input_text': result['extracted_text'],
        'output_text': result['extracted_text'],
        'image_url': image_url,
        'confidence_score': result['confidence_score'],
        'processing_time_ms': result['processing_time_ms'],
        'created_at': now,
        'is_exported': False,
    }

    if OCR_HISTORY_RETENTION_DAYS > 0:
        item['ocr_expires_at'] = now + timedelta(days=OCR_HISTORY_RETENTION_DAYS)

    return item

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Database = Depends(get_database)):
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
        _cleanup_expired_ocr_history(db, current_user['_id'])

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

        history_id = None
        save_history_enabled = current_user.get('settings', {}).get('save_history', True)

        if save_history_enabled:
            history_item = _build_ocr_history_item(current_user, result, ocr_request.image_url)
            insert_result = db.processing_history.insert_one(history_item)
            history_id = str(insert_result.inserted_id)

        return {
            'extracted_text': result['extracted_text'],
            'confidence_score': result['confidence_score'],
            'processing_time_ms': result['processing_time_ms'],
            'image_dimensions': result['image_dimensions'],
            'processing_type': ocr_request.processing_type,
            'history_id': history_id
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
        _cleanup_expired_ocr_history(db, current_user['_id'])

        # Read file
        contents = await file.read()

        # Validate image
        OCRService.validate_image(contents)

        # Process OCR
        result = OCRService.process_image_file(contents, file.content_type)

        history_id = None
        save_history_enabled = current_user.get('settings', {}).get('save_history', True)

        if save_history_enabled:
            history_item = _build_ocr_history_item(current_user, result, f"file://{file.filename}")
            insert_result = db.processing_history.insert_one(history_item)
            history_id = str(insert_result.inserted_id)

        return {
            'extracted_text': result['extracted_text'],
            'confidence_score': result['confidence_score'],
            'processing_time_ms': result['processing_time_ms'],
            'image_dimensions': result['image_dimensions'],
            'history_id': history_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload OCR error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
