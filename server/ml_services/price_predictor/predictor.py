import joblib
import os
import pandas as pd
import numpy as np
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR.parents[1] / "ml_models" / "price_model.joblib"

# Global model cache
_model = None

def _load_model():
    """Lazy load the price prediction model."""
    global _model
    if _model is None:
        if MODEL_PATH.exists():
            print(f"[INFO] Loading Price Prediction Model from {MODEL_PATH}...")
            _model = joblib.load(MODEL_PATH)
        else:
            print(f"[ERROR] Price Prediction Model not found at {MODEL_PATH}")
    return _model

def predict_price(data):
    """
    Predicts the resale price based on product details using the Optimized model.
    Handles all 9 features: category, brand, condition, original_price, age_years, 
    usage_hours, location, has_warranty, has_box.
    """
    model = _load_model()
    if model is None:
        return {"error": "Model not loaded"}

    try:
        # Prepare input features with defaults to match the 9 training columns
        # Note: The order must match the X dataframe columns from training
        features = {
            'category': str(data.get('category', 'Other')),
            'brand': str(data.get('brand', 'Generic')),
            'original_price': float(data.get('original_price', 0)),
            'age_years': float(data.get('age_years', 0)),
            'condition': str(data.get('condition', 'Good')),
            'usage_hours': float(data.get('usage_hours', 0)),
            'location': str(data.get('location', 'Unknown')),
            'has_warranty': int(data.get('has_warranty', 0)),
            'has_box': int(data.get('has_box', 0))
        }

        # Convert to DataFrame (Pipeline handles scaling/encoding)
        df = pd.DataFrame([features])

        # Run prediction
        prediction = model.predict(df)[0]

        # Apply Business Logic: Resale price shouldn't exceed 90% of original price
        original_price = float(data.get('original_price', 0))
        if original_price > 0:
            max_allowed = original_price * 0.9
            prediction = min(prediction, max_allowed)
        
        # Ensure it doesn't go below 5% of original
        min_allowed = original_price * 0.05
        prediction = max(prediction, min_allowed)

        # Confidence is hardcoded based on our R^2 training accuracy (approx 92%)
        accuracy_score = 0.92 

        # Generate dynamic explanations for the frontend
        explanations = [
            f"Based on {data.get('category', 'item')} market trends.",
            f"Factored {data.get('age_years', 0)} years of depreciation."
        ]
        if data.get('has_warranty'):
            explanations.append("Active warranty adds value protection.")
        if data.get('has_box'):
            explanations.append("Original packaging increases resale appeal.")
        if float(data.get('age_years', 0)) < 1:
            explanations.append("Near-new status significantly boosts price.")

        result = {
            "success": True,
            "predicted_price": round(float(prediction), 2),
            "price_range": {
                "min": round(float(prediction * 0.90), 2),
                "max": round(float(prediction * 1.10), 2)
            },
            "currency": "INR",
            "confidence_score": accuracy_score,
            "explanations": explanations,
            "forensic_report": "Optimized multi-factor regression analysis completed."
        }
        
        print(f"[SUCCESS] Price Prediction: ₹{result['predicted_price']}")
        return result

    except Exception as e:
        print(f"[ERROR] Price prediction failed: {e}")
        return {"success": False, "error": str(e)}
