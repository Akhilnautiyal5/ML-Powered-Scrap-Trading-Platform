"""
Notifications Routes
Manages user notifications for transactions, purchases, and messages
"""

from flask import Blueprint, request, jsonify
from firebase_admin import db
import uuid
import time
from utils.auth_helper import token_required

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


def _resolve_identity_keys(user_id):
    """Resolve uid/username aliases for reliable notification delivery."""
    identity_keys = {str(user_id)}
    users = db.reference("users").get() or {}
    for uid, user_data in users.items():
        if not isinstance(user_data, dict):
            continue
        uid_str = str(uid)
        username = str(user_data.get("username", "")).strip()
        if uid_str == str(user_id) and username:
            identity_keys.add(username)
        if username and username == str(user_id):
            identity_keys.add(uid_str)
    return identity_keys


@notifications_bp.route("/user/<user_id>", methods=["GET"])
def get_user_notifications(user_id):
    """Get all notifications for a user with optional pagination"""
    try:
        limit = request.args.get("limit", 50, type=int)
        read_filter = request.args.get("read", None)  # None, "true", "false"
        
        notifications_ref = db.reference(f'notifications/{user_id}')
        notifications_data = notifications_ref.get() or {}
        
        notifications_list = list(notifications_data.values()) if notifications_data else []
        
        # Filter by read status if specified
        if read_filter == "true":
            notifications_list = [n for n in notifications_list if n.get('read', False)]
        elif read_filter == "false":
            notifications_list = [n for n in notifications_list if not n.get('read', False)]
        
        # Sort by created_at descending (newest first)
        notifications_list.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        
        # Apply limit
        notifications_list = notifications_list[:limit]
        
        # Count unread
        unread_count = sum(1 for n in notifications_list if not n.get('read', False))
        
        return jsonify({
            "success": True,
            "notifications": notifications_list,
            "unread_count": unread_count,
            "total": len(notifications_list)
        }), 200
        
    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/user/<user_id>/unread-count", methods=["GET"])
def get_unread_count(user_id):
    """Get count of unread notifications for a user"""
    try:
        notifications_ref = db.reference(f'notifications/{user_id}')
        notifications_data = notifications_ref.get() or {}
        
        unread_count = sum(1 for n in notifications_data.values() if not n.get('read', False))
        
        return jsonify({
            "success": True,
            "unread_count": unread_count
        }), 200
        
    except Exception as e:
        print(f"Error getting unread count: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/<notification_id>/mark-read", methods=["POST"])
def mark_notification_read(notification_id):
    """Mark a single notification as read"""
    try:
        data = request.json
        user_id = data.get("user_id")
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        notification_ref = db.reference(f'notifications/{user_id}/{notification_id}')
        notification_ref.update({"read": True})
        
        return jsonify({"success": True, "message": "Notification marked as read"}), 200
        
    except Exception as e:
        print(f"Error marking notification as read: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/user/<user_id>/mark-all-read", methods=["POST"])
def mark_all_read(user_id):
    """Mark all notifications as read for a user"""
    try:
        notifications_ref = db.reference(f'notifications/{user_id}')
        notifications_data = notifications_ref.get() or {}
        
        updates = 0
        for notif_id, notif in notifications_data.items():
            if not notif.get('read', False):
                db.reference(f'notifications/{user_id}/{notif_id}').update({"read": True})
                updates += 1
        
        return jsonify({
            "success": True,
            "message": f"Marked {updates} notifications as read"
        }), 200
        
    except Exception as e:
        print(f"Error marking all as read: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/<notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    """Delete a specific notification"""
    try:
        data = request.json
        user_id = data.get("user_id")
        
        if not user_id:
            return jsonify({"error": "user_id required"}), 400
        
        db.reference(f'notifications/{user_id}/{notification_id}').delete()
        
        return jsonify({"success": True, "message": "Notification deleted"}), 200
        
    except Exception as e:
        print(f"Error deleting notification: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/user/<user_id>/clear", methods=["POST"])
def clear_all_notifications(user_id):
    """Clear all notifications for a user"""
    try:
        db.reference(f'notifications/{user_id}').delete()
        return jsonify({
            "success": True,
            "message": "All notifications cleared"
        }), 200
        
    except Exception as e:
        print(f"Error clearing notifications: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/transaction-start", methods=["POST"])
def create_transaction_notification():
    """Create notification when transaction starts"""
    try:
        data = request.json
        seller_id = data.get("seller_id")
        buyer_id = data.get("buyer_id")
        product_name = data.get("product_name")
        escrow_id = data.get("escrow_id")
        product_id = data.get("product_id")
        
        if not all([seller_id, buyer_id, product_name, escrow_id]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Create notification for seller (uid + username aliases)
        notification_id = f"notif_{str(uuid.uuid4())[:12]}"
        now = int(time.time())
        recipients = _resolve_identity_keys(seller_id)
		
        for recipient in recipients:
            notification = {
                "notification_id": notification_id,
                "user_id": recipient,
                "type": "PURCHASE",
                "title": "Purchase Initiated",
                "message": f"A buyer purchased '{product_name}'",
                "read": False,
                "created_at": now,
                "related_escrow_id": escrow_id,
                "related_product_id": product_id,
                "related_user_id": buyer_id,
                "action_required": True
            }
            db.reference(f'notifications/{recipient}/{notification_id}').set(notification)
        
        return jsonify({
            "success": True,
            "notification_id": notification_id
        }), 201
        
    except Exception as e:
        print(f"Error creating transaction notification: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/payment-started", methods=["POST"])
def create_payment_started_notification():
    """Create notification when buyer starts payment from an escrow record."""
    try:
        data = request.json or {}
        escrow_id = data.get("escrow_id")
        buyer_id = data.get("buyer_id")

        if not escrow_id:
            return jsonify({"error": "Missing escrow_id"}), 400

        escrow = db.reference(f"escrows/{escrow_id}").get() or {}
        seller_id = escrow.get("seller_id")
        product_id = escrow.get("product_id")
        amount = escrow.get("ledger", {}).get("amount")

        if not seller_id:
            return jsonify({"error": "Seller not found for escrow"}), 404

        now = int(time.time())
        escrow_ref = db.reference(f"escrows/{escrow_id}")
        escrow_ref.update({
            "status_matrix/payment_status": "PROCESSING",
            "metadata/payment_started_at": now,
            "metadata/updated_at": now,
        })

        product_name = data.get("product_name") or escrow.get("product_name") or product_id or "Product"
        notification_id = create_notification(
            user_id=seller_id,
            type="PAYMENT_INITIATED",
            title="Payment Initiated",
            message=f"Buyer started payment for '{product_name}'",
            related_escrow_id=escrow_id,
            related_product_id=product_id,
            related_user_id=buyer_id,
        )

        return jsonify({
            "success": True,
            "notification_id": notification_id,
            "seller_id": seller_id,
            "escrow_id": escrow_id,
            "amount": amount,
            "payment_status": "PROCESSING",
        }), 201

    except Exception as e:
        print(f"Error creating payment-started notification: {str(e)}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/payment-received", methods=["POST"])
def create_payment_notification():
    """Create notification when payment is received"""
    try:
        data = request.json
        seller_id = data.get("seller_id")
        buyer_id = data.get("buyer_id")
        product_name = data.get("product_name")
        escrow_id = data.get("escrow_id")
        amount = data.get("amount")
        
        if not all([seller_id, buyer_id, product_name, escrow_id, amount]):
            return jsonify({"error": "Missing required fields"}), 400
        
        notification_id = create_notification(
            user_id=seller_id,
            type="PAYMENT_RECEIVED",
            title="Payment Received",
            message=f"Payment of ${amount} received for '{product_name}'",
            related_escrow_id=escrow_id,
            related_product_id=None,  # Could add if available
            related_user_id=buyer_id
        )
        
        return jsonify({
            "success": True,
            "message": "Payment notification created",
            "notification_id": notification_id
        }), 201
        
    except Exception as e:
        print(f"Error creating payment notification: {str(e)}")
        return jsonify({"error": str(e)}), 500


def create_notification(user_id, type, title, message, related_escrow_id=None, 
                       related_product_id=None, related_user_id=None):
    """Helper function to create notifications"""
    try:
        notification_id = f"notif_{str(uuid.uuid4())[:12]}"
        now = int(time.time())
        recipients = _resolve_identity_keys(user_id)
		
        for recipient in recipients:
            notification = {
                "notification_id": notification_id,
                "user_id": recipient,
                "type": type,
                "title": title,
                "message": message,
                "read": False,
                "created_at": now,
                "related_escrow_id": related_escrow_id,
                "related_product_id": related_product_id,
                "related_user_id": related_user_id,
                "action_required": type in ["PAYMENT_RECEIVED", "PRODUCT_SHIPPED", "PAYMENT_RELEASED", "PURCHASE", "PAYMENT_INITIATED"]
            }
            db.reference(f'notifications/{recipient}/{notification_id}').set(notification)
        return notification_id
        
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        return None
