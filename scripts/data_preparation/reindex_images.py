import os
import json
import numpy as np
import pickle
import requests
from io import BytesIO
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from tensorflow.keras.preprocessing import image
import sys

def reindex_images():
    print("[INFO] Starting Visual Search Indexing (MobileNetV2)...")
    
    # 1. Initialize MobileNetV2
    model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(224, 224, 3))
    print("[INFO] Model loaded (MobileNetV2)")
    
    # 2. Load products
    products_path = 'products.json'
    if not os.path.exists(products_path):
        print(f"[ERROR] {products_path} not found.")
        return
        
    with open(products_path, 'r') as f:
        products = json.load(f)
    print(f"[INFO] Found {len(products)} products to index.")

    feature_bank = []
    metadata = []
    
    for idx, p in enumerate(products):
        url = p.get('image_url')
        if not url:
            continue
            
        print(f"Processing [{idx+1}/{len(products)}]: {p.get('title')}")
        
        try:
            # Handle both local and remote images
            if url.startswith('http'):
                response = requests.get(url, timeout=10)
                img = Image.open(BytesIO(response.content)).convert('RGB')
            else:
                # Local paths need to be relative to root
                local_path = url.lstrip('/')
                img = Image.open(local_path).convert('RGB')
                
            # Preprocess
            img = img.resize((224, 224))
            x = image.img_to_array(img)
            x = np.expand_dims(x, axis=0)
            x = preprocess_input(x)
            
            # Extract features
            features = model.predict(x, verbose=0).flatten()
            features /= np.linalg.norm(features) # L2 normalization
            
            feature_bank.append(features)
            metadata.append({
                'id': p.get('id'),
                'title': p.get('title'),
                'category': p.get('category'),
                'price': p.get('price'),
                'image_url': url
            })
            
        except Exception as e:
            print(f"[WARNING] Error processing {url}: {e}")

    if not feature_bank:
        print("[ERROR] No images successfully indexed.")
        return

    # 3. Save feature database
    output_path = os.path.join('server', 'ml_services', 'image_search', 'image_search_model.pkl')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'wb') as f:
        pickle.dump({
            'features': np.vstack(feature_bank),
            'image_data': metadata,
            'model_info': 'MobileNetV2 (Avg Pooling)'
        }, f)
        
    print(f"[SUCCESS] Successfully indexed {len(metadata)} images to {output_path}")

if __name__ == "__main__":
    reindex_images()
