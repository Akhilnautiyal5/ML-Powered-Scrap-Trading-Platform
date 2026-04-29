"""In-app messaging routes with escrow integration, backed by Firebase RTDB."""

import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request
from firebase_admin import db
from utils.firebase_db import MessagesAPI, ProductsAPI

messaging_bp = Blueprint("messaging", __name__, url_prefix="/api/messaging")


def get_or_create_thread(product_id, buyer_id, seller_id):
    """Get existing thread or create new one for buyer-seller conversation."""
    thread_id = f"{product_id}_{buyer_id}_{seller_id}"
    
    existing = MessagesAPI.get_thread(thread_id)
    if existing:
        return existing
    
    new_thread = {
        "id": thread_id,
        "product_id": product_id,
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "messages": {},
        "status": "active",  # active, sold, closed
        "escrow_id": None,
    }
    
    MessagesAPI.create_thread(thread_id, new_thread)
    return new_thread


@messaging_bp.route("/threads", methods=["GET"])
def list_threads():
    """Get all message threads for a user (buyer or seller)."""
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400
    
    user_threads = MessagesAPI.get_user_threads(user_id)
    
    # Sort by most recent message
    for thread in user_threads:
        messages = thread.get("messages", {})
        if messages and isinstance(messages, dict):
            # Sort messages to find the last one
            msg_list = list(messages.values())
            msg_list.sort(key=lambda x: x.get("timestamp", ""))
            thread["last_message"] = msg_list[-1] if msg_list else None
        elif messages and isinstance(messages, list):
            # Fallback if messages are stored as list
            thread["last_message"] = messages[-1] if messages else None
        else:
            thread["last_message"] = None
            
        # Standardize messages format for frontend
        if isinstance(messages, dict):
            thread["messages"] = list(messages.values())
            thread["messages"].sort(key=lambda x: x.get("timestamp", ""))
    
    # Safely get timestamp or fallback to empty string and sort
    user_threads.sort(
        key=lambda x: (x.get("last_message") or {}).get("timestamp", x.get("created_at", "")),
        reverse=True
    )
    
    return jsonify({"success": True, "threads": user_threads}), 200


@messaging_bp.route("/thread/<thread_id>", methods=["GET"])
def get_thread(thread_id):
    """Get a specific message thread with all messages."""
    thread = MessagesAPI.get_thread(thread_id)
    
    if not thread:
        return jsonify({"success": False, "error": "Thread not found"}), 404
        
    messages = thread.get("messages", {})
    if isinstance(messages, dict):
        thread["messages"] = list(messages.values())
        thread["messages"].sort(key=lambda x: x.get("timestamp", ""))
    
    return jsonify({"success": True, "thread": thread}), 200


@messaging_bp.route("/thread", methods=["POST"])
def create_or_get_thread():
    """Create or retrieve a message thread for a product conversation."""
    data = request.get_json() or {}
    required = ["product_id", "buyer_id", "seller_id"]
    for field in required:
        if not data.get(field):
            return jsonify({"success": False, "error": f"Missing {field}"}), 400
    
    thread = get_or_create_thread(
        data["product_id"], data["buyer_id"], data["seller_id"]
    )
    
    # Ensure messages is a list format for UI
    messages = thread.get("messages", {})
    if isinstance(messages, dict):
        thread["messages"] = list(messages.values())
        thread["messages"].sort(key=lambda x: x.get("timestamp", ""))
        
    return jsonify({"success": True, "thread": thread}), 200


@messaging_bp.route("/thread/<thread_id>/message", methods=["POST"])
def send_message(thread_id):
    """Send a message in a thread."""
    data = request.get_json() or {}
    required = ["sender_id", "content"]
    for field in required:
        if not data.get(field):
            return jsonify({"success": False, "error": f"Missing {field}"}), 400
    
    thread = MessagesAPI.get_thread(thread_id)
    if not thread:
        return jsonify({"success": False, "error": "Thread not found"}), 404
    
    if data["sender_id"] not in [thread.get("buyer_id"), thread.get("seller_id")]:
        return jsonify({"success": False, "error": "Unauthorized sender"}), 403
    
    msg_id = str(uuid.uuid4())
    message = {
        "id": msg_id,
        "sender_id": data["sender_id"],
        "content": data["content"],
        "timestamp": datetime.utcnow().isoformat(),
        "read": False,
    }
    
    success = MessagesAPI.add_message(thread_id, msg_id, message)
    if success:
        try:
            receiver_id = thread.get("seller_id") if data["sender_id"] == thread.get("buyer_id") else thread.get("buyer_id")
            import time
            notification_id = f"notif_{str(uuid.uuid4())[:12]}"
            notif = {
                "notification_id": notification_id,
                "user_id": receiver_id,
                "type": "MESSAGE",
                "title": "New Message",
                "message": f"You have a new message: {data['content'][:50]}",
                "read": False,
                "created_at": int(time.time()),
                "related_escrow_id": thread.get("escrow_id"),
                "related_product_id": thread.get("product_id"),
                "related_user_id": data["sender_id"],
                "action_required": False
            }
            db.reference(f'notifications/{receiver_id}/{notification_id}').set(notif)
            print(f"🔥 [DEBUG] Notification created: {notification_id} for user mode '{receiver_id}'")
        except Exception as e:
            print(f"[WARNING] Failed to generate message notification: {str(e)}")
            
        return jsonify({"success": True, "message": message}), 201
    return jsonify({"success": False, "error": "Failed to add message"}), 500


@messaging_bp.route("/thread/<thread_id>/mark-read", methods=["POST"])
def mark_read(thread_id):
    """Mark all messages in a thread as read for a user."""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400
    
    thread = MessagesAPI.get_thread(thread_id)
    if not thread:
        return jsonify({"success": False, "error": "Thread not found"}), 404
        
    messages = thread.get("messages", {})
    if not messages:
        return jsonify({"success": True}), 200
        
    try:
        if isinstance(messages, dict):
            for msg_id, msg in messages.items():
                if msg.get("sender_id") != user_id and not msg.get("read"):
                    db.reference(f'messages/{thread_id}/messages/{msg_id}/read').set(True)
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@messaging_bp.route("/thread/<thread_id>/link-escrow", methods=["POST"])
def link_escrow(thread_id):
    """Link an escrow session to a message thread."""
    data = request.get_json() or {}
    escrow_id = data.get("escrow_id")
    if not escrow_id:
        return jsonify({"success": False, "error": "escrow_id required"}), 400
    
    thread = MessagesAPI.get_thread(thread_id)
    if not thread:
        return jsonify({"success": False, "error": "Thread not found"}), 404
        
    try:
        db.reference(f'messages/{thread_id}/escrow_id').set(escrow_id)
        db.reference(f'messages/{thread_id}/updated_at').set(datetime.utcnow().isoformat())
        thread["escrow_id"] = escrow_id
        return jsonify({"success": True, "thread": thread}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@messaging_bp.route("/thread/<thread_id>/mark-sold", methods=["POST"])
def mark_sold(thread_id):
    """Mark product as sold and close the thread."""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400
    
    thread = MessagesAPI.get_thread(thread_id)
    if not thread:
        return jsonify({"success": False, "error": "Thread not found"}), 404
    
    if thread.get("seller_id") != user_id:
        return jsonify({"success": False, "error": "Only seller can mark as sold"}), 403
        
    try:
        timestamp = datetime.utcnow().isoformat()
        db.reference(f'messages/{thread_id}/status').set("sold")
        db.reference(f'messages/{thread_id}/updated_at').set(timestamp)
        
        # Add system message
        msg_id = str(uuid.uuid4())
        system_msg = {
            "id": msg_id,
            "sender_id": "system",
            "content": "✅ Product marked as sold. Transaction completed.",
            "timestamp": timestamp,
            "read": False,
            "is_system": True,
        }
        MessagesAPI.add_message(thread_id, msg_id, system_msg)
        
        # Update product status 
        product_id = thread.get("product_id")
        if product_id:
            ProductsAPI.update(product_id, {
                "status": "sold",
                "sold_at": timestamp
            })
            
        thread["status"] = "sold"
        return jsonify({"success": True, "thread": thread}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@messaging_bp.route("/thread/<thread_id>/close", methods=["POST"])
def close_thread(thread_id):
    """Close a thread without marking as sold."""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400
    
    thread = MessagesAPI.get_thread(thread_id)
    if not thread:
        return jsonify({"success": False, "error": "Thread not found"}), 404
    
    if user_id not in [thread.get("buyer_id"), thread.get("seller_id")]:
        return jsonify({"success": False, "error": "Unauthorized"}), 403
        
    try:
        db.reference(f'messages/{thread_id}/status').set("closed")
        db.reference(f'messages/{thread_id}/updated_at').set(datetime.utcnow().isoformat())
        thread["status"] = "closed"
        return jsonify({"success": True, "thread": thread}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

