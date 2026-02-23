from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from fastapi.responses import StreamingResponse
from datetime import datetime
from bson.objectid import ObjectId
from app.models import ExportFormat
from app.services.export_service import ExportService
from app.database import get_database
from app.auth.jwt_handler import JWTHandler
from pymongo.database import Database
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/history", tags=["History & Export"])
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

@router.get("")
async def get_history(
    limit: int = 20,
    offset: int = 0,
    type: str = None,
    search: str = None,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Get user's processing history with pagination and filtering"""
    try:
        # Validate parameters
        limit = min(limit, 100)  # Max 100 items per request
        if limit <= 0: limit = 20
        if offset < 0: offset = 0

        # Build query
        query = {'user_id': current_user['_id']}

        if type:
            query['type'] = type.lower()

        if search:
            # Text search on input and output
            query['$or'] = [
                {'input_text': {'$regex': search, '$options': 'i'}},
                {'output_text': {'$regex': search, '$options': 'i'}}
            ]

        # Get total count
        total_count = db.processing_history.count_documents(query)

        # Get paginated results
        history = list(
            db.processing_history.find(query)
            .sort('created_at', -1)  # Most recent first
            .skip(offset)
            .limit(limit)
        )

        # Convert MongoDB ObjectId to string
        for item in history:
            item['_id'] = str(item['_id'])
            item['user_id'] = str(item['user_id'])
            item['created_at'] = item['created_at'].isoformat()

        return {
            'items': history,
            'total': total_count,
            'limit': limit,
            'offset': offset,
            'has_more': (offset + limit) < total_count
        }

    except Exception as e:
        logger.error(f"Get history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history"
        )

@router.get("/{item_id}")
async def get_history_item(
    item_id: str,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Get specific history item details"""
    try:
        # Verify user owns this history item
        try:
            obj_id = ObjectId(item_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid history ID"
            )

        item = db.processing_history.find_one({
            '_id': obj_id,
            'user_id': current_user['_id']
        })

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )

        # Convert to JSON-serializable format
        item['_id'] = str(item['_id'])
        item['user_id'] = str(item['user_id'])
        item['created_at'] = item['created_at'].isoformat()

        return item

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get history item error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history item"
        )

@router.delete("/{item_id}")
async def delete_history_item(
    item_id: str,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Delete a history item"""
    try:
        try:
            obj_id = ObjectId(item_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid history ID"
            )

        result = db.processing_history.delete_one({
            '_id': obj_id,
            'user_id': current_user['_id']
        })

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )

        return {
            'message': 'History item deleted successfully',
            'item_id': item_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete history item error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete history item"
        )

@router.post("/export/{item_id}")
async def export_history_item(
    item_id: str,
    format: ExportFormat = ExportFormat.PDF,
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Export a history item to specified format"""
    try:
        try:
            obj_id = ObjectId(item_id)
        except:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid history ID"
            )

        # Fetch history item
        item = db.processing_history.find_one({
            '_id': obj_id,
            'user_id': current_user['_id']
        })

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )

        # Export based on format
        if format == ExportFormat.PDF:
            file_content = ExportService.export_to_pdf(item)
            media_type = 'application/pdf'
        elif format == ExportFormat.DOCX:
            file_content = ExportService.export_to_docx(item)
            media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif format == ExportFormat.TXT:
            file_content = ExportService.export_to_txt(item)
            file_content = io.BytesIO(file_content.encode('utf-8'))
            media_type = 'text/plain'
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid export format"
            )

        # Mark as exported
        db.processing_history.update_one(
            {'_id': obj_id},
            {'$set': {'is_exported': True}}
        )

        # Generate filename
        filename = ExportService.get_filename(item['type'], format.value)

        # Return file as download
        return StreamingResponse(
            iter([file_content.getvalue()]),
            media_type=media_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export history item error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export history item"
        )

@router.delete("")
async def clear_history(
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Delete all history items for current user"""
    try:
        result = db.processing_history.delete_many({
            'user_id': current_user['_id']
        })

        return {
            'message': 'All history items deleted',
            'deleted_count': result.deleted_count
        }

    except Exception as e:
        logger.error(f"Clear history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear history"
        )

@router.get("/stats/summary")
async def get_history_stats(
    db: Database = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Get statistics about user's processing history"""
    try:
        user_id = current_user['_id']

        # Count by type
        type_counts = {}
        for type_name in ['ocr', 'grammar', 'paraphrase', 'translate']:
            count = db.processing_history.count_documents({
                'user_id': user_id,
                'type': type_name
            })
            if count > 0:
                type_counts[type_name] = count

        # Total items
        total = db.processing_history.count_documents({
            'user_id': user_id
        })

        # Exported count
        exported = db.processing_history.count_documents({
            'user_id': user_id,
            'is_exported': True
        })

        # Average processing time
        pipeline = [
            {'$match': {'user_id': user_id}},
            {'$group': {
                '_id': None,
                'avg_time': {'$avg': '$processing_time_ms'}
            }}
        ]
        avg_time = 0
        result = list(db.processing_history.aggregate(pipeline))
        if result:
            avg_time = result[0]['avg_time']

        return {
            'total_items': total,
            'exported_count': exported,
            'by_type': type_counts,
            'average_processing_time_ms': round(avg_time, 2)
        }

    except Exception as e:
        logger.error(f"Get history stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )
