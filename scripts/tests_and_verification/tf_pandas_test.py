import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import pandas as pd
print("Pandas loaded.")
try:
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    print("TF Loaded after Pandas.")
except Exception as e:
    print(f"FAILED: {e}")
