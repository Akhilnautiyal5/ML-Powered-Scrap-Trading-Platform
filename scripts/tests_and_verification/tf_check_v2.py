import os
# Silencing logs to see only errors
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
try:
    import tensorflow as tf
    print(f"TF Version: {tf.__version__}")
    from tensorflow.keras.applications import MobileNetV2
    model = MobileNetV2(weights='imagenet', include_top=False)
    print("✅ MobileNetV2 loaded successfully!")
except Exception as e:
    print(f"❌ Error: {e}")
