from flask import Blueprint, request, jsonify
from utils.firebase_db import WatchlistAPI

watchlist_bp = Blueprint("watchlist", __name__, url_prefix="/api/watchlist")

@watchlist_bp.route("/<user_id>", methods=["GET"])
def get_watchlist(user_id):
    """Retrieve all products in a user's watchlist."""
    items = WatchlistAPI.get_user_watchlist(user_id)
    return jsonify({"success": True, "watchlist": items})

@watchlist_bp.route("/", methods=["POST"])
def add_to_watchlist():
    """Add a product to the user's watchlist."""
    data = request.json
    user_id = data.get("user_id")
    product_id = data.get("product_id")
    target_price = float(data.get("target_price", 0.0))
    
    if not user_id or not product_id:
         return jsonify({"success": False, "error": "Missing user_id or product_id"}), 400
         
    success = WatchlistAPI.add_to_watchlist(user_id, product_id, target_price)
    if success:
        return jsonify({"success": True, "message": "Added to watchlist"}), 201
    return jsonify({"success": False, "error": "Failed to add to watchlist"}), 500

@watchlist_bp.route("/<user_id>/<product_id>", methods=["DELETE"])
def remove_from_watchlist(user_id, product_id):
    """Remove a product from the user's watchlist."""
    success = WatchlistAPI.remove_from_watchlist(user_id, product_id)
    if success:
        return jsonify({"success": True, "message": "Removed from watchlist"})
    return jsonify({"success": False, "error": "Failed to remove"}), 500
