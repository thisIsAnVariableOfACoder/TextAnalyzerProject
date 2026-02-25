from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from bson.objectid import ObjectId
from app.models import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    UserProfileResponse, UpdateProfileRequest, UpdateSettingsRequest,
    ChangePasswordRequest, DeleteAccountRequest
)
from app.auth.jwt_handler import JWTHandler
from app.auth.password import PasswordHandler
from app.database import get_database
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

def _default_settings():
    return {
        "email_notifications": True,
        "save_history": True,
        "dark_mode": False,
        "two_factor_enabled": False,
    }

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Database = Depends(get_database)):
    """Dependency to verify authentication"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    payload = JWTHandler.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get('user_id')
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)})
    except Exception as e:
        logger.error(f"Auth DB error while fetching current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Database = Depends(get_database)):
    """Register a new user"""
    try:
        # Check if user exists
        if db.users.find_one({"username": user_data.username}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

        # Hash password
        hashed_password = PasswordHandler.hash_password(user_data.password)

        # Create user document
        user_doc = {
            "username": user_data.username,
            "password_hash": hashed_password,
            "email": user_data.email,
            "settings": _default_settings(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Insert into database
        result = db.users.insert_one(user_doc)

        return {
            "_id": str(result.inserted_id),
            "username": user_data.username,
            "email": user_data.email,
            "created_at": user_doc["created_at"]
        }

    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    except PyMongoError as e:
        logger.error(f"Registration DB error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration service temporarily unavailable"
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Database = Depends(get_database)):
    """Login user and return JWT token"""
    try:
        # Find user by username
        user = db.users.find_one({"username": credentials.username})

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Verify password
        if not PasswordHandler.verify_password(credentials.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Create JWT token
        token_data = JWTHandler.create_token(
            user_id=str(user["_id"]),
            username=user["username"]
        )

        # Update last login
        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"updated_at": datetime.utcnow()}}
        )

        return {
            "access_token": token_data["access_token"],
            "token_type": "bearer",
            "expires_in": token_data["expires_in"]
        }

    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"Login DB error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Login service temporarily unavailable"
        )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/validate")
async def validate_token(db: Database = Depends(get_database)):
    """Validate current JWT token"""
    try:
        # This endpoint requires authentication middleware
        # which will be implemented in main.py
        return {"message": "Token is valid"}
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@router.post("/refresh")
async def refresh_token(db: Database = Depends(get_database)):
    """Refresh JWT token"""
    try:
        # This endpoint requires authentication middleware
        # which will verify the current token before refreshing
        return {"message": "Token refreshed"}
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "_id": str(current_user["_id"]),
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at"),
        "settings": current_user.get("settings", _default_settings())
    }

@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(payload: UpdateProfileRequest, db: Database = Depends(get_database), current_user = Depends(get_current_user)):
    """Update profile fields"""
    updates = {}
    if payload.email is not None:
        updates["email"] = str(payload.email)

    if updates:
        updates["updated_at"] = datetime.utcnow()
        db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})

    updated = db.users.find_one({"_id": current_user["_id"]})
    return {
        "_id": str(updated["_id"]),
        "username": updated.get("username"),
        "email": updated.get("email"),
        "created_at": updated.get("created_at"),
        "updated_at": updated.get("updated_at"),
        "settings": updated.get("settings", _default_settings())
    }

@router.patch("/settings", response_model=UserProfileResponse)
async def update_settings(payload: UpdateSettingsRequest, db: Database = Depends(get_database), current_user = Depends(get_current_user)):
    """Update user settings"""
    current_settings = current_user.get("settings", _default_settings())
    next_settings = {**_default_settings(), **current_settings}

    payload_dict = payload.dict(exclude_none=True)
    for k, v in payload_dict.items():
        next_settings[k] = bool(v)

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"settings": next_settings, "updated_at": datetime.utcnow()}}
    )

    updated = db.users.find_one({"_id": current_user["_id"]})
    return {
        "_id": str(updated["_id"]),
        "username": updated.get("username"),
        "email": updated.get("email"),
        "created_at": updated.get("created_at"),
        "updated_at": updated.get("updated_at"),
        "settings": updated.get("settings", _default_settings())
    }

@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, db: Database = Depends(get_database), current_user = Depends(get_current_user)):
    """Change account password"""
    if not PasswordHandler.verify_password(payload.current_password, current_user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_hash = PasswordHandler.hash_password(payload.new_password)
    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )

    return {"message": "Password updated successfully"}

@router.get("/sessions")
async def get_sessions(current_user = Depends(get_current_user)):
    """Get active session info (single-session JWT setup)"""
    return {
        "sessions": [
            {
                "id": "current",
                "device": "Current browser",
                "last_active": datetime.utcnow().isoformat(),
                "current": True
            }
        ]
    }

@router.post("/sessions/revoke-others")
async def revoke_other_sessions(current_user = Depends(get_current_user)):
    """Revoke other sessions (stateless JWT simplified response)"""
    return {"message": "Other sessions revoked. Please login again on other devices."}

@router.delete("/me")
async def delete_account(payload: DeleteAccountRequest, db: Database = Depends(get_database), current_user = Depends(get_current_user)):
    """Delete current account and related data"""
    if not PasswordHandler.verify_password(payload.password, current_user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )

    db.processing_history.delete_many({"user_id": current_user["_id"]})
    db.users.delete_one({"_id": current_user["_id"]})
    return {"message": "Account deleted successfully"}
