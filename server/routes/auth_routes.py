# server/routes/auth_routes.py
"""
Authentication Routes

Handles:
- User registration
- User login
- Profile retrieval
- Profile update
"""

from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
import bcrypt
import uuid
import re

from firebase_admin import db
from utils.auth_helper import token_required


# =====================================================
# Blueprint Configuration
# =====================================================

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# =====================================================
# Helper Functions
# =====================================================

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PHONE_REGEX = re.compile(r"^[6-9][0-9]{9}$")


def normalize_input(value):
    """Normalize user input for consistent comparison."""
    return value.lower().strip()


def is_valid_email(email):
    """Validate email format."""
    return bool(EMAIL_REGEX.match(email.strip()))


def is_valid_phone(phone):
    """Validate Indian 10-digit mobile number."""
    trimmed = phone.strip()
    return bool(trimmed and PHONE_REGEX.match(trimmed))


def user_exists(username, email):
    """Check if username or email already exists."""
    
    users_ref = db.reference("users")
    users = users_ref.get()

    if not isinstance(users, dict):
        return False

    username_clean = normalize_input(username)
    email_clean = normalize_input(email)

    for uid, user in users.items():
        if user.get("username", "").lower() == username_clean:
            return True
        if user.get("email", "").lower() == email_clean:
            return True

    return False


def generate_token(user_id):
    """Generate JWT token for authentication."""
    
    token = jwt.encode(
        {
            "user_id": user_id,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return token


# =====================================================
# Routes
# =====================================================

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user."""

    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    full_name = data.get("full_name", "")
    phone = data.get("phone", "")

    if not username or not email or not password:
        return jsonify({
            "success": False,
            "message": "Required fields missing!"
        }), 400

    email = email.strip()
    phone = phone.strip()
    username_clean = normalize_input(username)
    email_clean = normalize_input(email)

    if not is_valid_email(email):
        return jsonify({
            "success": False,
            "message": "Enter a valid email address."
        }), 400

    if len(password) < 6:
        return jsonify({
            "success": False,
            "message": "Password must be at least 6 characters."
        }), 400

    if phone and not is_valid_phone(phone):
        return jsonify({
            "success": False,
            "message": "Enter a valid 10-digit Indian phone number."
        }), 400

    # Check existing user
    if user_exists(username_clean, email_clean):
        return jsonify({
            "success": False,
            "message": "Username or email already registered!"
        }), 409

    # Password hashing
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(
        password.encode("utf-8"), salt
    ).decode("utf-8")

    uid = str(uuid.uuid4())

    new_user = {
        "username": username_clean,
        "email": email_clean,
        "password": hashed_pw,
        "full_name": full_name,
        "phone": phone,
        "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
        "profilePic": f"https://ui-avatars.com/api/?name={username_clean}&background=random",
        "bio": "New member of the TradeSmart community."
    }

    db.reference(f"users/{uid}").set(new_user)

    return jsonify({
        "success": True,
        "message": "Registration successful!",
        "uid": uid
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user and return JWT token."""

    data = request.get_json()

    identifier = normalize_input(data.get("identifier", ""))
    password = data.get("password")

    if not identifier or not password:
        return jsonify({
            "success": False,
            "message": "Enter username/email and password!"
        }), 400

    users = db.reference("users").get()

    if not isinstance(users, dict):
        users = {}

    target_uid = None
    target_user = None

    for uid, user in users.items():
        if user.get("username") == identifier or user.get("email") == identifier:
            target_uid = uid
            target_user = user
            break

    if not target_user:
        return jsonify({
            "success": False,
            "message": "Incorrect credentials!"
        }), 401

    # Password check
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        target_user["password"].encode("utf-8")
    ):
        return jsonify({
            "success": False,
            "message": "Incorrect credentials!"
        }), 401

    token = generate_token(target_uid)

    # Remove password before returning
    public_user = target_user.copy()
    public_user.pop("password", None)
    public_user["uid"] = target_uid

    return jsonify({
        "success": True,
        "message": "Login successful!",
        "token": token,
        "user": public_user
    }), 200


@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    """Return logged-in user's profile."""

    profile = current_user.copy()
    profile.pop("password", None)

    return jsonify({
        "success": True,
        "profile": profile
    }), 200


@auth_bp.route("/user/<user_id>", methods=["GET"])
def get_user_by_id(user_id):
    """Return public user profile by user ID."""
    user_data = db.reference(f"users/{user_id}").get()
    if not user_data:
        return jsonify({"success": False, "error": "User not found"}), 404

    public_user = user_data.copy()
    public_user.pop("password", None)
    public_user["uid"] = user_id

    return jsonify({"success": True, "user": public_user}), 200


@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile(current_user):
    """Update user profile."""

    data = request.get_json()
    uid = current_user["uid"]

    user_ref = db.reference(f"users/{uid}")

    updates = {}

    if "full_name" in data:
        updates["full_name"] = data["full_name"]

    if "phone" in data:
        updates["phone"] = data["phone"]

    if "bio" in data:
        updates["bio"] = data["bio"]

    if "profilePic" in data:
        updates["profilePic"] = data["profilePic"]

    if not updates:
        return jsonify({
            "success": False,
            "message": "No changes detected!"
        }), 400

    user_ref.update(updates)

    return jsonify({
        "success": True,
        "message": "Profile updated successfully!"
    }), 200