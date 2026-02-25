from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from bson.objectid import ObjectId
from app.models import (
    GrammarCheckRequest, GrammarCheckResponse,
    ParaphraseRequest, ParaphraseResponse,
    TranslateRequest, TranslateResponse
)
from app.services.text_service import TextProcessingService
from app.database import get_database
from app.auth.jwt_handler import JWTHandler
from pymongo.database import Database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/text", tags=["Text Processing"])
security = HTTPBearer(auto_error=False)

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

@router.post("/grammar-check", response_model=GrammarCheckResponse)
async def check_grammar(
    request: GrammarCheckRequest,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Check grammar and spelling in text"""
    try:
        result = TextProcessingService.check_grammar(request.text, request.language)

        history_id = None
        save_history_enabled = (
            current_user.get('settings', {}).get('save_history', True)
            and bool(request.save_history)
        )

        if save_history_enabled:
            history_item = {
                'user_id': current_user['_id'],
                'type': 'grammar',
                'input_text': request.text,
                'output_text': result['corrected_text'],
                'input_language': request.language,
                'output_language': request.language,
                'processing_time_ms': result['processing_time_ms'],
                'created_at': datetime.utcnow(),
                'is_exported': False,
                'metadata': {
                    'issues_found': result['issues_found'],
                    'suggestions_count': len(result['suggestions'])
                }
            }
            insert_result = db.processing_history.insert_one(history_item)
            history_id = str(insert_result.inserted_id)

        return {
            'original_text': result['original_text'],
            'suggestions': result['suggestions'],
            'corrected_text': result['corrected_text'],
            'issues_found': result['issues_found'],
            'history_id': history_id
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Grammar check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Grammar checking failed"
        )

@router.post("/paraphrase", response_model=ParaphraseResponse)
async def paraphrase_text(
    request: ParaphraseRequest,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Paraphrase and improve text"""
    try:
        result = TextProcessingService.paraphrase(request.text, request.style or 'normal')

        history_id = None
        save_history_enabled = current_user.get('settings', {}).get('save_history', True)

        if save_history_enabled:
            history_item = {
                'user_id': current_user['_id'],
                'type': 'paraphrase',
                'input_text': request.text,
                'output_text': result['paraphrased_text'],
                'processing_time_ms': result['processing_time_ms'],
                'created_at': datetime.utcnow(),
                'is_exported': False,
                'metadata': {
                    'style': result['style'],
                    'alternatives_count': len(result['alternatives'])
                }
            }
            insert_result = db.processing_history.insert_one(history_item)
            history_id = str(insert_result.inserted_id)

        return {
            'original_text': result['original_text'],
            'paraphrased_text': result['paraphrased_text'],
            'alternatives': result['alternatives'],
            'history_id': history_id
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Paraphrase error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Paraphrasing failed"
        )

@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    request: TranslateRequest,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Translate text to target language"""
    try:
        result = TextProcessingService.translate(
            request.text,
            request.source_language,
            request.target_language
        )

        history_id = None
        save_history_enabled = current_user.get('settings', {}).get('save_history', True)

        if save_history_enabled:
            history_item = {
                'user_id': current_user['_id'],
                'type': 'translate',
                'input_text': request.text,
                'output_text': result['translated_text'],
                'input_language': request.source_language,
                'output_language': request.target_language,
                'processing_time_ms': result['processing_time_ms'],
                'created_at': datetime.utcnow(),
                'is_exported': False,
                'metadata': {
                    'detected_language': result['detected_language']
                }
            }
            insert_result = db.processing_history.insert_one(history_item)
            history_id = str(insert_result.inserted_id)

        return {
            'original_text': result['original_text'],
            'translated_text': result['translated_text'],
            'source_language': result['source_language'],
            'target_language': result['target_language'],
            'detected_language': result['detected_language'],
            'history_id': history_id
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Translation failed"
        )

@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages for translation"""
    try:
        languages = TextProcessingService.get_supported_languages()
        return {
            'languages': languages,
            'total': len(languages)
        }
    except Exception as e:
        logger.error(f"Get languages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get languages"
        )
