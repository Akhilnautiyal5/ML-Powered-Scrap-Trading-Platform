"""Routes for logo verification service."""

import os
import uuid
from flask import Blueprint, jsonify, request, send_from_directory
from pathlib import Path

from ml_services.logo_verifier import get_available_brands, verify_logo
from ml_services.logo_verifier.config import REFERENCE_LOGO_DIR

logo_bp = Blueprint("logo", __name__, url_prefix="/api/logo")

BASE_DIR = Path(__file__).resolve().parent


@logo_bp.route("/brands", methods=["GET"])
def list_brands():
    """Lists all brands currently in the reference database."""
    return jsonify({"success": True, "brands": get_available_brands()})


@logo_bp.route("/reference/<brand>/<filename>", methods=["GET"])
def serve_reference_logo(brand, filename):
    """Serves a reference logo image for display."""
    ref_dir = Path(REFERENCE_LOGO_DIR)
    if not ref_dir.exists():
        return jsonify({"success": False, "error": "Reference directory not found"}), 404

    # Prefer brand subfolder layout: reference_logos/<brand>/<filename>
    candidates = [ref_dir / brand.lower() / filename, ref_dir / filename]
    for file_path in candidates:
        if file_path.exists():
            return send_from_directory(str(file_path.parent), file_path.name)

    return jsonify({"success": False, "error": f"Logo '{filename}' not found"}), 404


@logo_bp.route("/reference/<filename>", methods=["GET"])
def serve_reference_logo_legacy(filename):
    """Legacy reference logo endpoint."""
    ref_dir = Path(REFERENCE_LOGO_DIR)
    if not ref_dir.exists():
        return jsonify({"success": False, "error": "Reference directory not found"}), 404

    direct = ref_dir / filename
    if direct.exists():
        return send_from_directory(str(ref_dir), filename)

    # If reference set is nested by brand, search within subfolders
    try:
        found = next(ref_dir.rglob(filename), None)
        if found and found.exists():
            return send_from_directory(str(found.parent), found.name)
    except Exception:
        pass

    return jsonify({"success": False, "error": f"Logo '{filename}' not found"}), 404


@logo_bp.route("/verify", methods=["POST"])
def verify_logo_route():
    """Verifies an uploaded logo against the reference database."""
    try:
        if "image" not in request.files:
            return jsonify({"success": False, "error": "Image is required"}), 400
        image_file = request.files["image"]
        if image_file.filename == "":
            return jsonify({"success": False, "error": "No file selected"}), 400

        brand_hint = request.form.get("brand") or request.args.get("brand")
        print(f"[INFO] Logo Verification Started for brand: {brand_hint or 'Auto'}")

        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        extension = image_file.filename.rsplit(".", 1)[-1].lower()
        temp_path = os.path.join(upload_dir, f"{uuid.uuid4()}.{extension}")
        image_file.save(temp_path)

        result = verify_logo(temp_path, brand_hint)
        print(f"[SUCCESS] Logo Verification Completed: {result.get('status')}")

        try:
            os.remove(temp_path)
        except OSError:
            pass

        return jsonify(result), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
