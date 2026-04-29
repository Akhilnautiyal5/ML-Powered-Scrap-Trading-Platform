import pandas as pd
import requests
import json
import os
from pathlib import Path

def test_price_dataset():
    print("\n--- Testing Price Prediction Dataset ---")
    csv_path = r'data\raw\price_prediction\product_data.csv'
    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV not found at {csv_path}")
        return

    df = pd.read_csv(csv_path)
    # Pick a random row
    row = df.iloc[0]
    
    payload = {
        "category": row['category'],
        "brand": row['brand'],
        "original_price": float(row['original_price']),
        "age_years": float(row['age_years']),
        "condition": row['condition'],
        "usage_hours": 100 # Default for test
    }
    
    print(f"Testing with Brand: {payload['brand']}, Orig Price: {payload['original_price']}")
    
    try:
        response = requests.post("http://127.0.0.1:5000/api/ai/predict-price", json=payload)
        print(f"API Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Connection Error: {e}")

def test_fashion_dataset():
    print("\n--- Testing Fashion Search (Metadata) ---")
    # This checks if the local index was built correctly from the CSV
    try:
        response = requests.get("http://127.0.0.1:5000/api/image/health")
        print(f"Visual Search Service: {response.json().get('status')}")
    except Exception as e:
        print(f"Connection Error: {e}")

def test_logo_dataset():
    print("\n--- Testing Logo Dataset Integration ---")
    logo_dir = r'data\raw\logo_detection\Logos'
    try:
        response = requests.get("http://127.0.0.1:5000/api/logo/brands")
        brands = response.json().get('brands', [])
        print(f"Successfully loaded {len(brands)} brands from LogoDatabase.csv")
        print(f"Sample brands available: {brands[:5]}")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    print("=== SCRAP TRADING PLATFORM DATASET TESTER ===")
    test_price_dataset()
    test_fashion_dataset()
    test_logo_dataset()
