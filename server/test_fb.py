import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db

load_dotenv('.env')

db_url = os.getenv('DATABASE_URL')
storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET', 'scrap-trade-b1ea7.appspot.com')
cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 'serviceAccountKey.json')

print(f"DATABASE_URL: {db_url}")
print(f"cred_path exists: {os.path.exists(cred_path)}")

try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {'databaseURL': db_url, 'storageBucket': storage_bucket})
    else:
        firebase_admin.initialize_app(options={'databaseURL': db_url, 'storageBucket': storage_bucket})
    print("Firebase init logic completed.")
except Exception as e:
    print(f"Init error: {e}")

try:
    ref = db.reference("users")
    users = ref.get()
    print("Users:", type(users))
except Exception as e:
    print("DB connection error:", repr(e))
