from utils.firebase_db import FirebaseDB
import json

# Test the earnings API
user_id = 'test_user'
transactions = FirebaseDB.query_filter('wallet_transactions', 'user_id', user_id)
print(f'Found {len(transactions) if transactions else 0} transactions for user {user_id}')
if transactions:
    for tx in transactions[:5]:
        print(f'Type: {tx.get("type")}, Amount: {tx.get("amount")}, User: {tx.get("user_id")}')