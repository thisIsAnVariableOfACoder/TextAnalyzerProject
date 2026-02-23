from pymongo import MongoClient
from pymongo.database import Database
from bson.objectid import ObjectId
from contextlib import asynccontextmanager
from app.config import MONGODB_URL, DATABASE_NAME
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    client: MongoClient = None
    db: Database = None

    @classmethod
    def connect_db(cls):
        """Connect to MongoDB"""
        try:
            cls.client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
            cls.db = cls.client[DATABASE_NAME]

            # Test connection
            cls.db.admin.command('ping')
            logger.info("MongoDB connected successfully")

            # Create indexes
            cls._create_indexes()
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    @classmethod
    def close_db(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

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

            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")

    @classmethod
    def get_db(cls) -> Database:
        """Get database instance"""
        if cls.db is None:
            cls.connect_db()
        return cls.db


# Database connection helper
def get_database() -> Database:
    """Dependency for getting database"""
    return MongoDB.get_db()
