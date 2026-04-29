"""
Migration Script: Transfer JSON data to Firebase Realtime Database
This script reads local JSON files and uploads them to Firebase Realtime Database
"""

import json
import os
import sys
import firebase_admin
from firebase_admin import credentials, db
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def load_json_file(file_path):
    """Load JSON file from disk"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ Loaded: {file_path}")
        return data
    except Exception as e:
        print(f"❌ Error loading {file_path}: {e}")
        return None

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            cred_path = os.path.join(os.path.dirname(__file__), '..', 'server', 'serviceAccountKey.json')
            db_url = "https://scrap-trade-b1ea7-default-rtdb.asia-southeast1.firebasedatabase.app"
            
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {'databaseURL': db_url})
            else:
                firebase_admin.initialize_app(options={'databaseURL': db_url})
            
            print(f"✅ Firebase initialized")
            return True
    except Exception as e:
        print(f"❌ Firebase initialization error: {e}")
        return False

def migrate_products(data):
    """Migrate products to Firebase"""
    try:
        if not data:
            print(" No products data to migrate")
            return
        
        print(f"\n📦 Migrating {len(data)} products...")
        ref = db.reference('products')
        
        # Convert list to dict with ID as key for better structure
        products_dict = {}
        for product in data:
            product_id = product.get('id')
            if product_id:
                products_dict[product_id] = product
        
        ref.set(products_dict)
        print(f"✅ Successfully migrated {len(products_dict)} products to Firebase")
    except Exception as e:
        print(f"❌ Error migrating products: {e}")

def migrate_escrow(data):
    """Migrate escrow records to Firebase"""
    try:
        if not data:
            print("⚠️  No escrow data to migrate")
            return
        
        print(f"\n💳 Migrating {len(data)} escrow records...")
        ref = db.reference('escrow')
        
        # Convert list to dict with ID as key
        escrow_dict = {}
        for record in data:
            escrow_id = record.get('id')
            if escrow_id:
                escrow_dict[escrow_id] = record
        
        ref.set(escrow_dict)
        print(f"✅ Successfully migrated {len(escrow_dict)} escrow records to Firebase")
    except Exception as e:
        print(f"❌ Error migrating escrow: {e}")

def migrate_feedback(data):
    """Migrate feedback to Firebase"""
    try:
        if not data:
            print("⚠️  No feedback data to migrate")
            return
        
        print(f"\n⭐ Migrating feedback...")
        ref = db.reference('feedback')
        
        # Handle product feedback
        product_feedback = data.get('product_feedback', [])
        if product_feedback:
            feedback_dict = {}
            for fb in product_feedback:
                fb_id = fb.get('id')
                if fb_id:
                    feedback_dict[fb_id] = fb
            
            ref.child('product').set(feedback_dict)
            print(f"✅ Migrated {len(feedback_dict)} product feedback records")
        
        # Handle general feedback
        general_feedback = data.get('general_feedback', [])
        if general_feedback:
            feedback_dict = {}
            for fb in general_feedback:
                fb_id = fb.get('id')
                if fb_id:
                    feedback_dict[fb_id] = fb
            
            ref.child('general').set(feedback_dict)
            print(f"✅ Migrated {len(feedback_dict)} general feedback records")
    except Exception as e:
        print(f"❌ Error migrating feedback: {e}")

def migrate_messages(data):
    """Migrate messages to Firebase"""
    try:
        if not data:
            print("⚠️  No messages data to migrate")
            return
        
        print(f"\n💬 Migrating {len(data)} message threads...")
        ref = db.reference('messages')
        
        # Convert list to dict with thread_id as key
        messages_dict = {}
        for thread in data:
            thread_id = thread.get('thread_id')
            if thread_id:
                messages_dict[thread_id] = thread
        
        ref.set(messages_dict)
        print(f"✅ Successfully migrated {len(messages_dict)} message threads to Firebase")
    except Exception as e:
        print(f"❌ Error migrating messages: {e}")

def main():
    """Main migration function"""
    print("=" * 60)
    print("🚀 Starting JSON to Firebase Migration")
    print("=" * 60)
    
    # Initialize Firebase
    if not initialize_firebase():
        print("\n❌ Failed to initialize Firebase. Exiting.")
        return
    
    # Define file paths
    server_dir = os.path.join(os.path.dirname(__file__), '..', 'server')
    files = {
        'products': os.path.join(server_dir, 'products.json'),
        'escrow': os.path.join(server_dir, 'escrow_store.json'),
        'feedback': os.path.join(server_dir, 'feedback_store.json'),
        'messages': os.path.join(server_dir, 'messages_store.json'),
    }
    
    # Confirm before proceeding
    print("\n⚠️  This will upload your local JSON data to Firebase Realtime Database.")
    print("📋 Files to migrate:")
    for file_type, file_path in files.items():
        exists = "✅" if os.path.exists(file_path) else "❌"
        print(f"  {exists} {file_type}: {file_path}")
    
    response = input("\n🤔 Do you want to continue? (yes/no): ").lower().strip()
    if response != 'yes':
        print("❌ Migration cancelled.")
        return
    
    # Migrate each file type
    products_data = load_json_file(files['products'])
    migrate_products(products_data)
    
    escrow_data = load_json_file(files['escrow'])
    migrate_escrow(escrow_data)
    
    feedback_data = load_json_file(files['feedback'])
    migrate_feedback(feedback_data)
    
    messages_data = load_json_file(files['messages'])
    migrate_messages(messages_data)
    
    print("\n" + "=" * 60)
    print("✅ Migration completed!")
    print("=" * 60)
    print("\n📍 Your data is now available at:")
    print("  🔗 https://console.firebase.google.com/project/scrap-trade-b1ea7")
    print("\n💡 To verify, check Firebase Console:")
    print("  • Realtime Database tab")
    print("  • Look for: products, escrow, feedback, messages nodes")

if __name__ == "__main__":
    main()
