"""
Smart AI Wardrobe Assistant - Database Connection
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db = None


db_instance = Database()


async def connect_to_mongo():
    """Create database connection."""
    try:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        # Verify connection
        await db_instance.client.admin.command("ping")
        logger.info(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")

        # Create indexes
        await create_indexes()
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise e


async def close_mongo_connection():
    """Close database connection."""
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


async def create_indexes():
    """Create necessary database indexes for performance."""
    db = db_instance.db
    # Users
    await db.users.create_index("email", unique=True)
    # Clothing items
    await db.clothing_items.create_index("user_id")
    await db.clothing_items.create_index([("user_id", 1), ("category", 1)])
    # Outfits
    await db.outfits.create_index("user_id")
    # Analytics/logs
    await db.wear_logs.create_index("user_id")
    await db.chat_history.create_index("user_id")
    logger.info("✅ Database indexes created.")


def get_database():
    """Return database instance."""
    return db_instance.db
