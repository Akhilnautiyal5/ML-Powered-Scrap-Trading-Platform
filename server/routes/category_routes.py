from flask import Blueprint, request, jsonify
from utils.firebase_db import CategoriesAPI
import uuid

category_bp = Blueprint("category", __name__, url_prefix="/api/categories")

@category_bp.route("/", methods=["GET"])
def get_categories():
    """Retrieve all standard second-hand product categories and average values."""
    categories = CategoriesAPI.get_all()
    return jsonify({"success": True, "categories": categories})

@category_bp.route("/", methods=["POST"])
def add_category():
    """Add a new standardized product category for the second-hand market."""
    data = request.json
    required = ["name", "average_market_value"]
    
    for req in required:
        if req not in data:
            return jsonify({"success": False, "error": f"Missing {req}"}), 400
            
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    
    success = CategoriesAPI.add_category(category_id, data)
    if success:
        return jsonify({"success": True, "category_id": category_id}), 201
    return jsonify({"success": False, "error": "Failed to add category"}), 500

@category_bp.route("/<category_id>/price", methods=["PUT"])
def update_price(category_id):
    """Update the average market value for a category based on trends."""
    data = request.json
    new_price = float(data.get("average_market_value", 0))
    if new_price <= 0:
        return jsonify({"success": False, "error": "Invalid price"}), 400
        
    success = CategoriesAPI.update_price(category_id, new_price)
    if success:
        return jsonify({"success": True, "message": "Market value updated successfully"})
    return jsonify({"success": False, "error": "Failed to update"}), 500
