import logging
from typing import Optional, Any

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError

from app.core.config import settings

logger = logging.getLogger("lax360.database")


class DatabaseManager:
    """
    Manages a single synchronous PyMongo connection.

    Priority order for MongoDB URI:
        1. MONGO_URI  environment variable  (Render's preferred secret key)
        2. MONGODB_URI environment variable  (alternate name)

    If neither is set and USE_IN_MEMORY_FALLBACK=True, falls back to mongomock
    for local development only.  In production (Render) set USE_IN_MEMORY_FALLBACK=False
    so a missing URI causes an explicit startup failure instead of a silent mock.
    """

    def __init__(self):
        self.sync_client: Optional[Any] = None
        self.sync_db: Optional[Any] = None
        self.is_mock: bool = False

    # ------------------------------------------------------------------
    def connect(self):
        """Establish the MongoDB connection.  Called once during app startup."""
        if self.sync_db is not None:
            return  # already connected

        mongo_uri = settings.effective_mongo_uri

        # ── Case 1: No URI supplied at all ────────────────────────────
        if not mongo_uri:
            if settings.USE_IN_MEMORY_FALLBACK:
                self._start_mock("No MONGO_URI / MONGODB_URI env variable found.")
                return
            else:
                raise RuntimeError(
                    "MongoDB URI is not configured.  "
                    "Set the MONGO_URI (or MONGODB_URI) environment variable on Render "
                    "with your MongoDB Atlas connection string "
                    "(e.g. mongodb+srv://user:pass@cluster.mongodb.net/dbname)."
                )

        # ── Case 2: URI supplied – attempt real connection ─────────────
        logger.info("Connecting to MongoDB …  (URI host redacted for security)")

        # Atlas SRV URIs need longer timeouts than a local server.
        is_atlas = "mongodb+srv://" in mongo_uri or ".mongodb.net" in mongo_uri
        connect_timeout_ms = 30_000 if is_atlas else 5_000
        server_sel_timeout_ms = 30_000 if is_atlas else 5_000

        try:
            client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=server_sel_timeout_ms,
                connectTimeoutMS=connect_timeout_ms,
                socketTimeoutMS=30_000,
                # Recommended TLS settings for Atlas
                tls=is_atlas,
                tlsAllowInvalidCertificates=False,
                retryWrites=True,
            )
            # Verify the server is reachable
            client.admin.command("ping")

            self.sync_client = client
            self.sync_db = client[settings.DATABASE_NAME]
            self.is_mock = False
            logger.info("✅ Successfully connected to MongoDB (database: %s)", settings.DATABASE_NAME)

        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            self._handle_connection_error(str(e))
        except ConfigurationError as e:
            raise RuntimeError(
                f"MongoDB URI is malformed: {e}.  "
                "Check MONGO_URI / MONGODB_URI on Render."
            ) from e
        except Exception as e:
            self._handle_connection_error(str(e))

        self._create_indexes()

    # ------------------------------------------------------------------
    def _handle_connection_error(self, reason: str):
        if settings.USE_IN_MEMORY_FALLBACK:
            self._start_mock(reason)
        else:
            raise RuntimeError(
                f"Cannot connect to MongoDB: {reason}\n"
                "Verify the following on Render:\n"
                "  1. MONGO_URI (or MONGODB_URI) is set to a valid Atlas SRV URI.\n"
                "  2. Your Atlas cluster Network Access allows connections from 0.0.0.0/0 (all IPs).\n"
                "  3. The DB user credentials embedded in the URI are correct.\n"
                "  4. USE_IN_MEMORY_FALLBACK is set to False in Render env vars."
            )

    # ------------------------------------------------------------------
    def _start_mock(self, reason: str):
        """Fall back to an in-memory mongomock instance (local dev only)."""
        try:
            import mongomock
        except ImportError:
            raise RuntimeError(
                "mongomock is not installed.  "
                "Add `mongomock>=4.1.2` to requirements.txt or "
                "set a real MONGO_URI environment variable."
            )
        logger.warning(
            "⚠️  %s  Falling back to in-memory mongomock database "
            "(data will NOT persist across restarts – for local dev only).",
            reason,
        )
        self.sync_client = mongomock.MongoClient()
        self.sync_db = self.sync_client[settings.DATABASE_NAME]
        self.is_mock = True
        self._create_indexes()

    # ------------------------------------------------------------------
    def disconnect(self):
        """Close the client connection cleanly on shutdown."""
        if self.sync_client is not None:
            try:
                self.sync_client.close()
                logger.info("MongoDB connection closed.")
            except Exception as e:
                logger.warning("Error while closing MongoDB connection: %s", e)
            finally:
                self.sync_client = None
                self.sync_db = None

    # ------------------------------------------------------------------
    def get_db(self):
        if self.sync_db is None:
            self.connect()
        return self.sync_db

    # ------------------------------------------------------------------
    def _create_indexes(self):
        """Create tenant-isolation and performance indexes (idempotent)."""
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
            logger.warning("Note while creating indexes: %s", e)


# ── Singleton instance ────────────────────────────────────────────────────────
db_manager = DatabaseManager()


def get_database():
    """FastAPI dependency / convenience function to retrieve the active DB."""
    return db_manager.get_db()
