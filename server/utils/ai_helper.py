import os
import requests
import numpy as np
from PIL import Image
from io import BytesIO
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def download_and_process_image(url_or_path, target_size=(224, 224)):
    """
    Downloads or reads an image and prepares it for the ML model.
    """
    try:
        if isinstance(url_or_path, str) and (url_or_path.startswith('http://') or url_or_path.startswith('https://')):
            # Remote URL
            response = requests.get(url_or_path, timeout=10)
            img = Image.open(BytesIO(response.content)).convert('RGB')
        else:
            # Local path
            if os.path.exists(url_or_path):
                img = Image.open(url_or_path).convert('RGB')
            else:
                # Try relative to project root if not found
                # (Assumes being called from within 'server' or root)
                img = Image.open(os.path.abspath(url_or_path)).convert('RGB')
        
        img = img.resize(target_size)
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        return x
    except Exception as e:
        print(f"[ERROR] Failed to process image {url_or_path}: {e}")
        return None
