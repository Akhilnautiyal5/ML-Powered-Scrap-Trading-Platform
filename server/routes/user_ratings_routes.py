from flask import Blueprint, request, jsonify
from utils.firebase_db import UserRatingsAPI
import uuid

ratings_bp = Blueprint("ratings", __name__, url_prefix="/api/ratings")

@ratings_bp.route("/", methods=["POST"])
def submit_rating():
    """Submit a peer-to-peer rating for a completed transaction."""
    data = request.json
    
    if not all(k in data for k in ("reviewer_id", "reviewee_id", "escrow_id", "rating")):
        return jsonify({"success": False, "error": "Missing required fields"}), 400
        
    try:
        data["rating"] = float(data["rating"])
        if data["rating"] < 1 or data["rating"] > 5:
            return jsonify({"success": False, "error": "Rating must be between 1 and 5"}), 400
    except ValueError:
        return jsonify({"success": False, "error": "Invalid rating format"}), 400
        
    rating_id = f"rate_{uuid.uuid4().hex[:12]}"
    success = UserRatingsAPI.add_rating(rating_id, data)
    
    if success:
        return jsonify({"success": True, "rating_id": rating_id}), 201
    return jsonify({"success": False, "error": "Failed to submit rating"}), 500

@ratings_bp.route("/user/<user_id>/score", methods=["GET"])
def get_trust_score(user_id):
    """Get the aggregate trust score and reviews for a user."""
    score = UserRatingsAPI.get_trust_score(user_id)
    ratings = UserRatingsAPI.get_user_ratings(user_id)
    
    # Optional: sanitize reviews output slightly
    return jsonify({
        "success": True, 
        "trust_score": round(score, 1), 
        "total_reviews": len(ratings) if ratings else 0,
        "ratings": ratings
    })
