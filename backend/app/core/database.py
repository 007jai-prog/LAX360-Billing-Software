import logging
import asyncio
from typing import Optional, Dict, Any
from pymongo import MongoClient, ASCENDING, DESCENDING
import mongomock
from app.core.config import settings

logger = logging.getLogger("lax360.database")

class DatabaseManager:
    def __init__(self):
        self.sync_client: Optional[Any] = None
        self.sync_db: Optional[Any] = None
        self.is_mock: bool = False

    def connect(self):
        if self.sync_db is not None:
            return
        try:
            logger.info(f"Attempting to connect to MongoDB at {settings.MONGODB_URI}...")
            # Try connecting to configured MongoDB
            client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=1000,
                connectTimeoutMS=1000
            )
            # Test server connection
            client.admin.command('ping')
            self.sync_client = client
            self.sync_db = client[settings.DATABASE_NAME]
            self.is_mock = False
            logger.info("Successfully connected to live MongoDB!")
        except Exception as e:
            if settings.USE_IN_MEMORY_FALLBACK:
                logger.warning(f"MongoDB connection failed ({str(e)}). Falling back to in-memory mongomock database.")
                self.sync_client = mongomock.MongoClient()
                self.sync_db = self.sync_client[settings.DATABASE_NAME]
                self.is_mock = True
            else:
                logger.error(f"Failed to connect to MongoDB: {e}")
                raise e

        self.create_indexes()

    def get_db(self):
        if self.sync_db is None:
            self.connect()
        return self.sync_db

    def create_indexes(self):
        """Create tenant isolation and query performance indexes"""
        try:
            db = self.sync_db
            # Users
            db.users.create_index([("email", ASCENDING)], unique=True)
            db.users.create_index([("tenant_id", ASCENDING)])
            
            # Tenants
            db.tenants.create_index([("id", ASCENDING)], unique=True)
            
            # Products
            db.products.create_index([("tenant_id", ASCENDING), ("sku", ASCENDING)])
            db.products.create_index([("tenant_id", ASCENDING), ("barcode", ASCENDING)])
            
            # Invoices
            db.invoices.create_index([("tenant_id", ASCENDING), ("invoice_number", ASCENDING)])
            db.invoices.create_index([("tenant_id", ASCENDING), ("created_at", DESCENDING)])
            
            # Customers & Suppliers
            db.customers.create_index([("tenant_id", ASCENDING), ("phone", ASCENDING)])
            db.suppliers.create_index([("tenant_id", ASCENDING)])
            
            # Inventory & Movements
            db.inventory.create_index([("tenant_id", ASCENDING), ("product_id", ASCENDING)])
            db.stock_movements.create_index([("tenant_id", ASCENDING), ("created_at", DESCENDING)])
            
            # Restaurant
            db.restaurant_tables.create_index([("tenant_id", ASCENDING), ("table_number", ASCENDING)])
            db.kots.create_index([("tenant_id", ASCENDING), ("status", ASCENDING)])

            logger.info("MongoDB indexes verified.")
        except Exception as e:
            logger.warning(f"Note on creating indexes: {e}")

db_manager = DatabaseManager()

def get_database():
    return db_manager.get_db()
