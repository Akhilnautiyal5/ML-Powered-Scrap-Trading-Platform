import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db

load_dotenv('.env')

db_url = os.getenv('DATABASE_URL')
cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 'serviceAccountKey.json')

try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {'databaseURL': db_url})
    else:
        firebase_admin.initialize_app(options={'databaseURL': db_url})
    print("Firebase initialized.")
except Exception as e:
    print(f"Firebase init error: {e}")

from utils.firebase_db import FirebaseDB

# Check for escrows
escrows = FirebaseDB.query_filter('escrows', 'status', 'RELEASED')
print(f'Found {len(escrows) if escrows else 0} released escrows')
if escrows:
    for escrow in escrows[:3]:
        print(f'Escrow ID: {escrow.get("escrow_id")}, Seller: {escrow.get("seller_id")}, Amount: {escrow.get("ledger", {}).get("amount")}, Status: {escrow.get("status")}')

# Check wallet transactions
transactions = FirebaseDB.get_all('wallet_transactions')
print(f'\nFound {len(transactions) if transactions else 0} total wallet transactions')
if transactions:
    count = 0
    for tx_id, tx_data in transactions.items():
        if count >= 5:
            break
        print(f'TX: {tx_id}, Type: {tx_data.get("type")}, Amount: {tx_data.get("amount")}, User: {tx_data.get("user_id")}')
        count += 1