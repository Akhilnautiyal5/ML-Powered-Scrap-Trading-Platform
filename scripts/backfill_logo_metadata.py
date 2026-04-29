"""Backfill neutral logo metadata for legacy product records.

This script is intentionally conservative:
- it only updates products that have no logo metadata at all
- it never guesses `logo_visible`
- it is safe to run multiple times
"""

import os
import sys
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, db

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER_DIR = os.path.join(ROOT_DIR, "server")
LOGO_KEYS = ("logo_visible", "logo_status", "logo_verify_status", "logo_verification")


def _load_env():
    """Load server/.env when python-dotenv is available."""
    try:
        from dotenv import load_dotenv

        load_dotenv(os.path.join(SERVER_DIR, ".env"))
    except Exception:
        pass


def _initialize_firebase():
    """Initialize Firebase Admin SDK from repo-local server config."""
    _load_env()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")

    cred_setting = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    cred_path = cred_setting
    if not os.path.isabs(cred_path):
        cred_path = os.path.join(SERVER_DIR, cred_path)

    if firebase_admin._apps:
        return

    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {"databaseURL": database_url})
    else:
        firebase_admin.initialize_app(options={"databaseURL": database_url})


def main():
    """Backfill unknown logo metadata for products with no logo state."""
    try:
        _initialize_firebase()
    except Exception as exc:
        print(f"ERROR: Firebase initialization failed: {exc}", file=sys.stderr)
        return 1

    products = db.reference("products").get() or {}
    updated = 0
    already_populated = 0
    skipped = 0

    for product_id, product in products.items():
        if not isinstance(product, dict):
            skipped += 1
            print(f"SKIP {product_id}: product payload is not an object")
            continue

        if any(key in product for key in LOGO_KEYS):
            already_populated += 1
            continue

        db.reference(f"products/{product_id}").update(
            {
                "logo_status": "unknown",
                "logo_verify_status": "unknown",
                "updated_at": datetime.now().isoformat(),
            }
        )
        updated += 1
        print(f"UPDATED {product_id}: {product.get('title', '(untitled product)')}")

    print("")
    print("Backfill summary")
    print(f"- updated: {updated}")
    print(f"- already populated: {already_populated}")
    print(f"- skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
