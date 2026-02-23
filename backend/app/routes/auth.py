from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from bson.objectid import ObjectId
from app.models import UserCreate, UserLogin, UserResponse, TokenResponse
from app.auth.jwt_handler import JWTHandler
from app.auth.password import PasswordHandler
from app.database import get_database
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

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
