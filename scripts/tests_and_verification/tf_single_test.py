import os
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing import image
import numpy as np
import pickle

def test_single_index():
    print("[INFO] Loading MobileNetV2 for single index test...", flush=True)
    model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg', input_shape=(224, 224, 3))
    
    # Create a random noise image to test
    print("[INFO] Creating dummy noise image...", flush=True)
    noise_img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    
    x = image.img_to_array(noise_img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    
    print("[INFO] Predicting features...", flush=True)
    features = model.predict(x, verbose=0).flatten()
    print(f"[INFO] extracted features shape: {features.shape}", flush=True)
    
    output_path = r'c:\Users\Akshit\Desktop\MAJOR PROJECT\ML-Powered-Scrap-Trading-Platform\server\models\test_fashion_model.pkl'
    with open(output_path, 'wb') as f:
        pickle.dump({'features': features}, f)
        
    print(f"[SUCCESS] Single index test worked! Saved to {output_path}", flush=True)

if __name__ == "__main__":
    test_single_index()
