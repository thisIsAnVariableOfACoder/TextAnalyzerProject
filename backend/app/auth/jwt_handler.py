import jwt
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

logger = logging.getLogger(__name__)

class JWTHandler:
    """Handle JWT token generation and verification"""

    @staticmethod
    def create_token(user_id: str, username: str) -> Dict[str, str]:
        """
        Create JWT token

        Args:
            user_id: MongoDB user ID
            username: Username

        Returns:
            Dictionary with access_token and expires_in
        """
        try:
            payload = {
                "user_id": str(user_id),
                "username": username,
                "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
                "iat": datetime.utcnow()
            }

            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

            return {
                "access_token": token,
                "expires_in": JWT_EXPIRATION_HOURS * 3600  # seconds
            }
        except Exception as e:
            logger.error(f"Error creating token: {e}")
            raise

    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """
        Verify JWT token

        Args:
            token: JWT token string

        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None

    @staticmethod
    def extract_token_from_header(authorization: str) -> Optional[str]:
        """
        Extract token from Authorization header

        Args:
            authorization: Authorization header value

        Returns:
            Token string if valid format, None otherwise
        """
        try:
            parts = authorization.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1]
            return None
        except Exception as e:
            logger.error(f"Error extracting token: {e}")
            return None
