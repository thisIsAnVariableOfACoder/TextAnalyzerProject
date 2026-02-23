import asyncio
import logging
from typing import List
from datetime import datetime
from bson.objectid import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from app.models import BatchProcessingRequest, BatchProcessingResponse, ProcessingType
from app.services.text_service import TextProcessingService
from app.services.ocr_service import OCRService
from app.database import get_database
from app.auth.jwt_handler import JWTHandler
from pymongo.database import Database
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/batch", tags=["Batch Processing"])
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

@router.post("/process", response_model=BatchProcessingResponse)
async def batch_process(
    request: BatchProcessingRequest,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Process multiple items in batch"""
    try:
        start_time = time.time()

        # Validate batch size
        if len(request.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch items cannot be empty"
            )

        if len(request.items) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum batch size is 5 items"
            )

        # Process items
        results = []
        successful = 0
        failed = 0

        for idx, item in enumerate(request.items):
            try:
                if request.processing_type == ProcessingType.GRAMMAR:
                    result = TextProcessingService.check_grammar(
                        item.get('text', ''),
                        item.get('language', 'en')
                    )
                    results.append({
                        'index': idx,
                        'status': 'success',
                        'data': result
                    })
                    successful += 1

                elif request.processing_type == ProcessingType.PARAPHRASE:
                    result = TextProcessingService.paraphrase(
                        item.get('text', ''),
                        item.get('style', 'normal')
                    )
                    results.append({
                        'index': idx,
                        'status': 'success',
                        'data': result
                    })
                    successful += 1

                elif request.processing_type == ProcessingType.TRANSLATE:
                    result = TextProcessingService.translate(
                        item.get('text', ''),
                        item.get('source_language', 'auto'),
                        item.get('target_language', 'en')
                    )
                    results.append({
                        'index': idx,
                        'status': 'success',
                        'data': result
                    })
                    successful += 1

                # Save to history
                db.processing_history.insert_one({
                    'user_id': current_user['_id'],
                    'type': request.processing_type.value,
                    'input_text': item.get('text', '')[:100],
                    'output_text': results[-1]['data'].get('output_text', '')[:100]
                        if results[-1]['status'] == 'success' else '',
                    'processing_time_ms': 0,
                    'created_at': datetime.utcnow(),
                    'is_exported': False,
                    'batch_index': idx
                })

            except Exception as e:
                logger.error(f"Batch item {idx} processing error: {e}")
                results.append({
                    'index': idx,
                    'status': 'error',
                    'error': str(e)
                })
                failed += 1

        processing_time = time.time() - start_time

        return {
            'batch_id': str(ObjectId()),
            'total_items': len(request.items),
            'successful': successful,
            'failed': failed,
            'results': results,
            'processing_time_ms': processing_time * 1000
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch processing failed"
        )

@router.get("/status/{batch_id}")
async def get_batch_status(
    batch_id: str,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Get batch processing status"""
    try:
        # Fetch batch items from history
        batch_items = list(
            db.processing_history.find({
                'batch_id': batch_id,
                'user_id': current_user['_id']
            })
        )

        if not batch_items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )

        successful = sum(1 for item in batch_items if item.get('processing_time_ms', 0) >= 0)
        total_time = sum(item.get('processing_time_ms', 0) for item in batch_items)

        return {
            'batch_id': batch_id,
            'total_items': len(batch_items),
            'completed': successful,
            'total_processing_time_ms': total_time,
            'average_time_per_item': total_time / len(batch_items) if batch_items else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get batch status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get batch status"
        )
