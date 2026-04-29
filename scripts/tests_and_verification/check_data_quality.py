import pandas as pd
import os
import sys

def check_csv_quality():
    print("--- DATASET QUALITY CHECK ---")
    datasets = {
        "Price": r'..\..\data\raw\price_prediction\product_data.csv',
        "Fashion": r'..\..\data\raw\image_search\fashion.csv',
        "Logo": r'..\..\data\raw\logo_detection\LogoDatabase.csv'
    }
    
    for name, path in datasets.items():
        if not os.path.exists(path):
            print(f"[MISSING] {name} Dataset at {path}")
            continue
            
        try:
            df = pd.read_csv(path)
            print(f"[OK] {name} Dataset: {len(df)} rows, Columns: {list(df.columns)}")
            
            # Check for missing values
            null_count = df.isnull().sum().sum()
            if null_count > 0:
                print(f"    [WARNING] Found {null_count} missing values.")
            else:
                print(f"    [INFO] No missing values found.")
                
        except Exception as e:
            print(f"[ERROR] Loading {name} dataset: {e}")

if __name__ == "__main__":
    check_csv_quality()
