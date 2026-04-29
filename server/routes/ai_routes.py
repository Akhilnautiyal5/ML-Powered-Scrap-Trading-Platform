# server/routes/ai_routes.py
"""
AI-related API routes.
Handles:
1. Product price prediction
2. AI service health check
"""

from flask import Blueprint, request, jsonify

# ML service imports
from ml_services.price_predictor.predictor import predict_price

# =====================================================
# Blueprint Configuration
# =====================================================

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


# =====================================================
# Helper Functions
# =====================================================

def validate_request_data(data):
    """Validate required fields in request payload."""
    
    required_fields = [
        "category",
        "brand",
        "original_price",
        "age_years"
    ]

    for field in required_fields:
        if field not in data:
            return False, f"Missing required field: {field}"

    return True, None


# =====================================================
# Routes
# =====================================================

@ai_bp.route("/predict-price", methods=["POST"])
def predict_price_route():
    """Predict estimated resale price."""

    try:
        data = request.get_json()

        # Validate request payload
        valid, error = validate_request_data(data)
        if not valid:
            return jsonify({
                "success": False,
                "error": error
            }), 400

        # Run prediction
        result = predict_price(data)

        if "error" in result:
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 400

        return jsonify({
            "success": True,
            "data": result
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@ai_bp.route("/test", methods=["GET"])
def test_route():
    """Test endpoint to verify AI routes."""
    
    return jsonify({
        "success": True,
        "message": "AI routes are working"
    }), 200


@ai_bp.route("/price-range", methods=["GET"])
def price_range_route():
    """Returns a basic recommended price range for client-side validation."""

    return jsonify({
        "success": True,
        "data": {
            "lower": 100.0,
            "upper": 1_000_000.0,
        },
    }), 200