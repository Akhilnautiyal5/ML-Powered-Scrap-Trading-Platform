import os
import pickle
import numpy as np
import threading
import time
from pathlib import Path
from tensorflow.keras.applications import MobileNetV2
from sklearn.metrics.pairwise import cosine_similarity
from utils.firebase_db import ProductsAPI
from utils.ai_helper import download_and_process_image

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_MODEL_PATH = BASE_DIR.parents[1] / "ml_models" / "image_search_model.pkl"

# Global variables
_feature_extractor = None
_marketplace_index = {
    "features": None,
    "metadata": None,
    "last_updated": 0
}
_index_lock = threading.Lock()

# Cache duration (30 minutes for high performance)
CACHE_DURATION = 1800 

def _get_extractor():
    """Lazy load MobileNetV2."""
    global _feature_extractor
    if _feature_extractor is None:
        print("[INFO] Loading Image Search Feature Extractor (MobileNetV2)...")
        _feature_extractor = MobileNetV2(
            weights='imagenet', 
            include_top=False, 
            pooling='avg', 
            input_shape=(224, 224, 3)
        )
    return _feature_extractor

def _build_marketplace_index():
    """Fetches all products from Firebase and builds a feature index."""
    global _marketplace_index
    
    with _index_lock:
        # Check if cache is still valid
        if _marketplace_index["features"] is not None and (time.time() - _marketplace_index["last_updated"]) < CACHE_DURATION:
            return _marketplace_index["metadata"], _marketplace_index["features"]

        print("[INFO] Building Marketplace Visual Index (Optimized)...")
        products = ProductsAPI.get_all()
        
        if not products:
            print("[WARNING] No products found in marketplace to index.")
            return [], None

        extractor = _get_extractor()
        features_list = []
        metadata_list = []

        for p in products:
            img_url = p.get('image_url') or (p.get('image_urls')[0] if p.get('image_urls') else None)
            if not img_url:
                continue

            # Process image and extract features
            img_tensor = download_and_process_image(img_url)
            if img_tensor is not None:
                try:
                    feat = extractor.predict(img_tensor, verbose=0).flatten()
                    feat /= np.linalg.norm(feat) # L2 normalization
                    
                    features_list.append(feat)
                    metadata_list.append({
                        "id": p.get("id"),
                        "title": p.get("title", "Unnamed Product"),
                        "category": p.get("category", "Uncategorized"),
                        "price": p.get("price", 0),
                        "image_url": img_url,
                        "is_marketplace": True
                    })
                except Exception as e:
                    print(f"[WARNING] Feature extraction failed for {img_url}: {e}")

        if features_list:
            _marketplace_index["features"] = np.vstack(features_list)
            _marketplace_index["metadata"] = metadata_list
            _marketplace_index["last_updated"] = time.time()
            print(f"[SUCCESS] Indexed {len(metadata_list)} marketplace products.")
        else:
            print("[WARNING] No marketplace images could be indexed.")
            
        return _marketplace_index["metadata"], _marketplace_index["features"]

def search_similar_images(image_path, top_k=6):
    """
    Finds the most visually similar items in the live marketplace.
    """
    try:
        extractor = _get_extractor()
        metadata, features_db = _build_marketplace_index()
        
        if features_db is None or len(features_db) == 0:
            return {"success": False, "error": "No marketplace products available for visual search."}

        # 1. Process Query Image
        img_tensor = download_and_process_image(image_path)
        if img_tensor is None:
            return {"success": False, "error": "Could not process uploaded image."}

        # 2. Extract Features
        query_vector = extractor.predict(img_tensor, verbose=0)
        query_vector = query_vector.reshape(1, -1)
        query_vector /= np.linalg.norm(query_vector)

        # 3. Calculate Similarities
        similarities = cosine_similarity(query_vector, features_db)[0]

        # 4. Get Top K indices
        top_indices = similarities.argsort()[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            # Only include results with a reasonable similarity (Threshold: 40%)
            if score < 0.40:
                continue
                
            item = metadata[idx]
            results.append({
                "product_id": item.get('id'),
                "title": item.get('title'),
                "category": item.get('category'),
                "price": item.get('price'),
                "similarity_score": score,
                "similarity_percentage": int(score * 100),
                "image_url": item.get('image_url')
            })

        return {
            "success": True,
            "results": results,
            "count": len(results),
            "source": "live_marketplace"
        }

    except Exception as e:
        print(f"[ERROR] Marketplace image search failed: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}
