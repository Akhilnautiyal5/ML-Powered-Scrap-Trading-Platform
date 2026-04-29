from flask import Blueprint, request, jsonify
from utils.firebase_db import ShipmentsAPI
import uuid

shipment_bp = Blueprint("shipment", __name__, url_prefix="/api/shipments")

@shipment_bp.route("/", methods=["POST"])
def create_shipment():
    """Create a shipment tracking record for an escrow transaction."""
    data = request.json
    if "escrow_id" not in data:
        return jsonify({"success": False, "error": "Missing escrow_id"}), 400
        
    shipment_id = f"ship_{uuid.uuid4().hex[:12]}"
    data["status"] = "PENDING_PICKUP"
    
    success = ShipmentsAPI.create_shipment(shipment_id, data)
    if success:
        return jsonify({"success": True, "shipment_id": shipment_id}), 201
    return jsonify({"success": False, "error": "Failed to create shipment"}), 500

@shipment_bp.route("/escrow/<escrow_id>", methods=["GET"])
def get_shipment_by_escrow(escrow_id):
    """Get shipment tracking details by escrow_id."""
    shipments = ShipmentsAPI.get_by_escrow(escrow_id)
    return jsonify({"success": True, "shipments": shipments})

@shipment_bp.route("/<shipment_id>/status", methods=["PUT"])
def update_status(shipment_id):
    """Update the live tracking status of a shipment."""
    data = request.json
    status = data.get("status")
    location = data.get("current_location", "")
    
    if not status:
        return jsonify({"success": False, "error": "Missing status"}), 400
        
    success = ShipmentsAPI.update_status(shipment_id, status, location)
    if success:
        return jsonify({"success": True, "message": "Shipment status updated"})
    return jsonify({"success": False, "error": "Failed to update"}), 500
