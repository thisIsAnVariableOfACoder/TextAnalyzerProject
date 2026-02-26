from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ServerSelectionTimeoutError
from bson.objectid import ObjectId
from contextlib import asynccontextmanager
from fastapi import HTTPException, status
from app.config import MONGODB_URL, DATABASE_NAME, OCR_HISTORY_RETENTION_DAYS, DEBUG
from dotenv import load_dotenv
import os
import logging
from urllib.parse import urlsplit, parse_qsl, urlencode, urlunsplit
import certifi

logger = logging.getLogger(__name__)

class MongoDB:
    client: MongoClient = None
    db: Database = None

    @classmethod
    def _is_truthy(cls, value: str | None) -> bool:
        return str(value or "").strip().lower() in {"1", "true", "yes", "on"}

    @classmethod
    def _append_query_params(cls, uri: str, params: dict) -> str:
        """Append/override query params in MongoDB URI safely."""
        parts = urlsplit(uri)
        query_map = dict(parse_qsl(parts.query, keep_blank_values=True))
        for key, value in params.items():
            query_map[key] = value
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query_map), parts.fragment))

    @classmethod
    def _build_uri_candidates(cls, mongodb_url: str) -> list:
        """Build URI candidates to improve Atlas TLS/DNS compatibility."""
        def _looks_like_placeholder(uri: str) -> bool:
            return (
                "username:password@" in uri
                or "@cluster.mongodb.net" in uri
                or "mongodb+srv://username:" in uri
            )

        candidates = []

        if mongodb_url and not _looks_like_placeholder(mongodb_url):
            candidates.append(mongodb_url)
        elif mongodb_url:
            logger.warning(
                "Ignoring placeholder MongoDB URI from env. Please set a real Atlas URI or use local MongoDB."
            )

        # Atlas SRV URI sometimes fails in strict/corporate DNS environments.
        if mongodb_url.startswith("mongodb+srv://") and not _looks_like_placeholder(mongodb_url):
            candidates.append(
                cls._append_query_params(mongodb_url, {
                    "retryWrites": "true",
                    "w": "majority",
                    "tls": "true",
                })
            )
            # Some networks/ISPs break Atlas OCSP endpoint checks and cause TLS handshake failures.
            # This fallback keeps TLS enabled while skipping OCSP endpoint fetch.
            candidates.append(
                cls._append_query_params(mongodb_url, {
                    "retryWrites": "true",
                    "w": "majority",
                    "tls": "true",
                    "tlsDisableOCSPEndpointCheck": "true",
                })
            )

        fallback_url = os.getenv("MONGODB_URL_FALLBACK", "").strip()
        if fallback_url:
            candidates.append(fallback_url)

        # Local fallback should be explicit in production to avoid hidden misconfiguration.
        allow_local_fallback = cls._is_truthy(os.getenv("MONGODB_ALLOW_LOCAL_FALLBACK")) or DEBUG
        if allow_local_fallback and "mongodb://localhost:27017" not in candidates:
            candidates.append("mongodb://localhost:27017")

        # Keep order but remove duplicates
        seen = set()
        unique = []
        for item in candidates:
            if item not in seen:
                unique.append(item)
                seen.add(item)
        return unique

    @classmethod
    def connect_db(cls):
        """Connect to MongoDB"""
        client = None
        try:
            # Reload .env on each connect attempt so updated local config is picked up
            load_dotenv(override=True)
            mongodb_url = os.getenv("MONGODB_URL", MONGODB_URL)
            database_name = os.getenv("DATABASE_NAME", DATABASE_NAME)

            # Close stale client before creating a new one
            if cls.client is not None:
                try:
                    cls.client.close()
                except Exception:
                    pass

            server_selection_timeout_ms = int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"))
            connect_timeout_ms = int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "15000"))
            socket_timeout_ms = int(os.getenv("MONGO_SOCKET_TIMEOUT_MS", "20000"))

            connection_errors = []
            for candidate_uri in cls._build_uri_candidates(mongodb_url):
                try:
                    client = MongoClient(
                        candidate_uri,
                        serverSelectionTimeoutMS=server_selection_timeout_ms,
                        connectTimeoutMS=connect_timeout_ms,
                        socketTimeoutMS=socket_timeout_ms,
                        tlsCAFile=certifi.where(),
                    )
                    db = client[database_name]

                    # Test connection using admin database on client
                    client.admin.command('ping')

                    # Assign only after ping succeeds
                    cls.client = client
                    cls.db = db
                    logger.info("MongoDB connected successfully")

                    # Create indexes
                    cls._create_indexes()
                    return
                except Exception as connect_err:
                    connection_errors.append(f"{type(connect_err).__name__}: {connect_err}")
                    if client is not None:
                        try:
                            client.close()
                        except Exception:
                            pass
                    client = None

            raise RuntimeError(" | ".join(connection_errors[-2:]))
        except Exception as e:
            if client is not None:
                try:
                    client.close()
                except Exception:
                    pass
            cls.client = None
            cls.db = None
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    @classmethod
    def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            try:
                cls.client.close()
                logger.info("MongoDB connection closed")
            finally:
                cls.client = None
                cls.db = None

    @classmethod
    def _create_indexes(cls):
        """Create database indexes for performance"""
        try:
            # Users collection indexes
            cls.db.users.create_index("username", unique=True)
            cls.db.users.create_index("email", unique=True, sparse=True)

            # Processing history indexes
            cls.db.processing_history.create_index("user_id")
            cls.db.processing_history.create_index("type")
            cls.db.processing_history.create_index("created_at")
            cls.db.processing_history.create_index([("user_id", 1), ("created_at", -1)])

            # Optional TTL index to auto-delete old OCR history documents
            # using dedicated expiry field to avoid index conflicts.
            if OCR_HISTORY_RETENTION_DAYS > 0:
                cls.db.processing_history.create_index(
                    [("ocr_expires_at", 1)],
                    expireAfterSeconds=0,
                    name="ocr_history_ttl_idx"
                )

            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")

    @classmethod
    def get_db(cls) -> Database:
        """Get database instance"""
        if cls.client is None or cls.db is None:
            cls.connect_db()
        else:
            try:
                cls.client.admin.command('ping')
            except Exception:
                cls.client = None
                cls.db = None
                cls.connect_db()
        return cls.db


# Database connection helper
def get_database() -> Database:
    """Dependency for getting database"""
    try:
        return MongoDB.get_db()
    except Exception as exc:
        logger.error("Database unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Database is unavailable. Verify Render env vars: MONGODB_URL, DATABASE_NAME; "
                "check Atlas user/password, Network Access IP allowlist, and TLS/SRV DNS connectivity."
            )
        )
