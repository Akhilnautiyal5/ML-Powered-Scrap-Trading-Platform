import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    import tensorflow as tf
    from tensorflow.keras.applications import MobileNetV2
    print("TF Loaded FIRST.")
except Exception as e:
    print(f"TF FAILED even if first: {e}")

try:
    import pandas as pd
    print("Pandas loaded SECOND.")
except Exception as e:
    print(f"Pandas failed: {e}")
