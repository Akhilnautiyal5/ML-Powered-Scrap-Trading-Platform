# IMPORT TENSORFLOW FIRST TO AVOID DLL CONFLICTS
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing import image

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import pandas as pd
import numpy as np
import pickle
import requests
from io import BytesIO
from PIL import Image
import sys

def train_fashion_search():
    print("[INFO] Starting Fashion Image Search Indexing (TF-FIRST Pattern)...")
    csv_path = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\data\raw\image_search\fashion.csv'
    model_dir = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\server\models'
    
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"[ERROR] Could not read CSV: {e}")
        return

    # Using 100 images for a quick but valid demo
    limit = 100 
    df = df.head(limit)
    
    print(f"[INFO] Initializing MobileNetV2...")
    model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(224, 224, 3))
    
    feature_bank = []
    metadata = []
    
    print(f"[INFO] Indexing {len(df)} images...")
    for idx, row in df.iterrows():
        url = row['ImageURL']
        if pd.isna(url): continue
        
        if idx % 10 == 0:
            print(f"Progress: {idx}/{len(df)}")
            
        try:
            response = requests.get(url, timeout=5)
            img = Image.open(BytesIO(response.content)).convert('RGB')
            img = img.resize((224, 224))
            
            x = image.img_to_array(img)
            x = np.expand_dims(x, axis=0)
            x = preprocess_input(x)
            
            features = model.predict(x, verbose=0).flatten()
            features /= np.linalg.norm(features)
            
            feature_bank.append(features)
            metadata.append({
                'id': row['ProductId'],
                'title': row['ProductTitle'],
                'category': row['Category'],
                'image_url': url
            })
        except Exception as e:
            pass

    if feature_bank:
        output_path = os.path.join(model_dir, 'fashion_search_model.pkl')
        with open(output_path, 'wb') as f:
            pickle.dump({
                'features': np.vstack(feature_bank),
                'image_data': metadata,
                'model_name': 'MobileNetV2'
            }, f)
        print(f"[SUCCESS] Saved fashion search model to {output_path}")
    else:
        print("[ERROR] No images were successfully indexed.")

if __name__ == "__main__":
    train_fashion_search()
