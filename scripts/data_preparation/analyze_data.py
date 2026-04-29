import pandas as pd
import os

file_path = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\data\raw\price_prediction\product_data.csv'

def analyze_csv(path):
    df = pd.read_csv(path)
    print(f"Dataset Shape: {df.shape}")
    print("\nMissing Values:")
    print(df.isnull().sum())
    print("\nDuplicate Rows:", df.duplicated().sum())
    print("\nColumn Types:")
    print(df.dtypes)
    print("\nUnique Values in Categorical Columns:")
    for col in df.select_dtypes(include=['object']).columns:
        if col != 'product_id' and col != 'created_at':
            print(f"{col}: {df[col].unique()}")

analyze_csv(file_path)
