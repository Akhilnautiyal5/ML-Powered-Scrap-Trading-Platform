#!/usr/bin/env python3
"""
Fix product image URLs in Firebase Database
Replace /uploads/ paths with Firebase Storage URLs
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Initialize Firebase
import firebase_admin
from firebase_admin import credentials
from dotenv import load_dotenv

# Load .env from server directory
env_path = os.path.join(os.path.dirname(__file__), '..', 'server', '.env')
load_dotenv(env_path)

db_url = os.getenv('DATABASE_URL')
storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET', 'scrap-trade-b1ea7.appspot.com')
cred_path = os.path.join(os.path.dirname(__file__), '..', 'server', os.getenv('FIREBASE_CREDENTIALS_PATH', 'serviceAccountKey.json'))

if not firebase_admin._apps:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {'databaseURL': db_url, 'storageBucket': storage_bucket})
        print("Firebase initialized")
    else:
        print("Firebase credentials not found")
        sys.exit(1)

from server.utils.firebase_db import FirebaseDB

def fix_image_urls():
    """Update product image URLs to use Firebase Storage"""
    products = FirebaseDB.get_all('products')
    if not products:
        print("No products found")
        return

    bucket_base = "https://storage.googleapis.com/scrap-trade-b1ea7.appspot.com/product_images/"

    updated_count = 0
    for product_id, product in products.items():
        image_url = product.get('image_url', '')
        if image_url.startswith('/uploads/'):
            filename = image_url.replace('/uploads/', '')
            new_url = bucket_base + filename
            update_data = {'image_url': new_url}
            success = FirebaseDB.update('products', product_id, update_data)
            if success:
                updated_count += 1
                print(f"Updated {product_id}: {image_url} -> {new_url}")
            else:
                print(f"Failed to update {product_id}")

    print(f"Updated {updated_count} products")

if __name__ == "__main__":
    fix_image_urls()