"""
Quick validation script for config and database modules.
Run from the backend/ directory:
    python test_config.py
"""
import os
import sys
from importlib import reload

# ── Test 1: config loads with no URI set, fallback=True ──────────────────────
os.environ["MONGO_URI"] = ""
os.environ["MONGODB_URI"] = ""
os.environ["USE_IN_MEMORY_FALLBACK"] = "True"
os.environ["DATABASE_NAME"] = "lax360_test"

import app.core.config as cfg_mod
reload(cfg_mod)
settings = cfg_mod.settings

print("=== Config Test 1 ===")
print("effective_mongo_uri :", repr(settings.effective_mongo_uri))
print("USE_IN_MEMORY_FALLBACK :", settings.USE_IN_MEMORY_FALLBACK)
print("DATABASE_NAME :", settings.DATABASE_NAME)

assert settings.effective_mongo_uri == "", "Expected empty URI"
assert settings.USE_IN_MEMORY_FALLBACK is True, "Expected True"
print("[PASS] Config test 1: empty URI + fallback=True\n")

# ── Test 2: MONGO_URI env var is picked up ────────────────────────────────────
os.environ["MONGO_URI"] = "mongodb+srv://user:pass@test.mongodb.net/"
reload(cfg_mod)
s2 = cfg_mod.settings

print("=== Config Test 2 ===")
print("effective_mongo_uri :", repr(s2.effective_mongo_uri))
assert "mongodb+srv" in s2.effective_mongo_uri, "MONGO_URI not picked up"
print("[PASS] Config test 2: MONGO_URI env var is read correctly\n")

# ── Test 3: MONGODB_URI fallback env var ──────────────────────────────────────
os.environ["MONGO_URI"] = ""
os.environ["MONGODB_URI"] = "mongodb+srv://user2:pass2@cluster.mongodb.net/"
reload(cfg_mod)
s3 = cfg_mod.settings

print("=== Config Test 3 ===")
print("effective_mongo_uri :", repr(s3.effective_mongo_uri))
assert "mongodb+srv" in s3.effective_mongo_uri, "MONGODB_URI not picked up"
print("[PASS] Config test 3: MONGODB_URI env var is read as fallback\n")

# ── Test 4: database manager mock fallback ────────────────────────────────────
os.environ["MONGO_URI"] = ""
os.environ["MONGODB_URI"] = ""
os.environ["USE_IN_MEMORY_FALLBACK"] = "True"
os.environ["DATABASE_NAME"] = "lax360_test"

reload(cfg_mod)

import app.core.database as db_mod
reload(db_mod)
from app.core.database import DatabaseManager

mgr = DatabaseManager()
mgr.connect()

print("=== Database Test 4 ===")
print("is_mock :", mgr.is_mock)
assert mgr.is_mock is True, "Expected mock=True with no URI"

mgr.sync_db.test_col.insert_one({"hello": "world"})
doc = mgr.sync_db.test_col.find_one({"hello": "world"})
assert doc is not None and doc["hello"] == "world", "Read/write failed"
mgr.disconnect()
print("[PASS] Database test 4: mock DB read/write works, disconnect OK\n")

# ── Test 5: missing URI + fallback=False raises RuntimeError ─────────────────
os.environ["MONGO_URI"] = ""
os.environ["MONGODB_URI"] = ""
os.environ["USE_IN_MEMORY_FALLBACK"] = "False"

reload(cfg_mod)
reload(db_mod)
from app.core.database import DatabaseManager as DM2

mgr2 = DM2()
try:
    mgr2.connect()
    print("[FAIL] Test 5: should have raised RuntimeError")
    sys.exit(1)
except RuntimeError as e:
    print("=== Database Test 5 ===")
    print("RuntimeError message:", str(e)[:120])
    print("[PASS] Test 5: RuntimeError raised correctly on missing URI with fallback=False\n")

print("=" * 50)
print("ALL TESTS PASSED")
print("=" * 50)
