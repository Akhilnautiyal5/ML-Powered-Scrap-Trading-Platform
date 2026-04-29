# server/routes/product_routes.py
"""
Product listing routes.
Handles uploading product images and managing product listings.
"""

import json
import os
import uuid
from datetime import datetime
from urllib.parse import unquote, urlparse

import cloudinary
import cloudinary.uploader
from firebase_admin import db
from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from utils.auth_helper import token_required
from utils.firebase_db import ProductsAPI

product_bp = Blueprint("product", __name__, url_prefix="/api/products")

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def _compute_logo_status(logo_visible, logo_verification):
    """Compute the persisted `logo_status` field for a product.

    Possible values:
    - "not available": logo is not present/visible
    - "unverified": logo is present but not verified
    - "verified": logo verified as genuine
    - "counterfeit": logo verified as not genuine
    - "unknown": seller has not set logo visibility yet
    """

    if logo_visible is False:
        return "not available"

    if logo_visible is True:
        if isinstance(logo_verification, dict) and isinstance(logo_verification.get("is_genuine"), bool):
            return "verified" if logo_verification.get("is_genuine") else "counterfeit"
        return "unverified"

    return "unknown"


def _compute_logo_verify_status(logo_visible, logo_verification):
    """Compute the persisted `logo_verify_status` field for a product.

    Values:
    - "logo unavailable": logo not present/visible
    - "unverified": logo present but not verified yet
    - "genuine": verified as genuine
    - "fake": verified as not genuine
    - "unknown": seller has not set logo visibility yet
    """

    if logo_visible is False:
        return "logo unavailable"

    if logo_visible is True:
        if isinstance(logo_verification, dict) and isinstance(logo_verification.get("is_genuine"), bool):
            return "genuine" if logo_verification.get("is_genuine") else "fake"
        return "unverified"

    return "unknown"


def _parse_logo_visible(raw_logo_visible):
    """Parse a logo visibility flag from request or stored product data."""
    if isinstance(raw_logo_visible, bool):
        return raw_logo_visible

    if isinstance(raw_logo_visible, str):
        flag = raw_logo_visible.strip().lower()
        if flag in {"true", "1", "yes"}:
            return True
        if flag in {"false", "0", "no"}:
            return False

    return None


def _extract_logo_verification(raw_logo_verification):
    """Return a valid persisted logo verification payload or None."""
    if isinstance(raw_logo_verification, dict) and isinstance(raw_logo_verification.get("is_genuine"), bool):
        return raw_logo_verification

    if isinstance(raw_logo_verification, str) and raw_logo_verification.strip():
        try:
            parsed = json.loads(raw_logo_verification)
            if isinstance(parsed, dict) and isinstance(parsed.get("is_genuine"), bool):
                return parsed
        except Exception:
            return None

    return None


# ------------------------ UTIL FUNCTIONS ------------------------

def _ensure_cloudinary_configured():
    """Configure Cloudinary from environment variables."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    missing = []
    if not cloud_name:
        missing.append("CLOUDINARY_CLOUD_NAME")
    if not api_key:
        missing.append("CLOUDINARY_API_KEY")
    if not api_secret:
        missing.append("CLOUDINARY_API_SECRET")

    if missing:
        raise RuntimeError(f"Missing Cloudinary env vars: {', '.join(missing)}")

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


def allowed_file(filename):
    """Return True if uploaded file has allowed image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _upload_to_cloudinary(file_storage, unique_filename):
    """Upload Flask FileStorage to Cloudinary and return secure URL."""
    _ensure_cloudinary_configured()
    file_storage.stream.seek(0)
    result = cloudinary.uploader.upload(
        file_storage.stream,
        public_id=f"product_images/{unique_filename}",
        overwrite=True,
        resource_type="image",
    )
    return result.get("secure_url")


def _extract_cloudinary_public_id(image_url):
    """Extract Cloudinary public_id from a delivery URL."""
    if not isinstance(image_url, str):
        return None

    value = image_url.strip()
    if not value:
        return None

    parsed = urlparse(value)
    if not parsed.netloc or "cloudinary" not in parsed.netloc:
        return None

    marker = "/image/upload/"
    if marker not in parsed.path:
        return None

    tail = parsed.path.split(marker, 1)[1].strip("/")
    if not tail:
        return None

    parts = [segment for segment in tail.split("/") if segment]
    if not parts:
        return None

    version_index = -1
    for index, segment in enumerate(parts):
        if segment.startswith("v") and segment[1:].isdigit():
            version_index = index

    if version_index >= 0:
        if version_index + 1 >= len(parts):
            return None
        parts = parts[version_index + 1 :]

    public_id = unquote("/".join(parts))
    if "." in public_id:
        public_id = public_id.rsplit(".", 1)[0]

    return public_id or None


def _delete_cloudinary_image(image_url):
    """Delete Cloudinary image by URL. Returns (success, error_message)."""
    public_id = _extract_cloudinary_public_id(image_url)
    if not public_id:
        return True, None

    try:
        _ensure_cloudinary_configured()
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type="image",
            invalidate=True,
        )
        outcome = str((result or {}).get("result", "")).lower()
        if outcome in {"ok", "not found"}:
            return True, None
        return False, f"Cloudinary delete failed for '{public_id}': {result}"
    except Exception as exc:
        return False, str(exc)


def _normalize_image_url(image_url):
    """Return URL if full http(s), otherwise None."""
    if not isinstance(image_url, str):
        return None

    value = image_url.strip()
    if not value:
        return None

    if value.startswith("http://") or value.startswith("https://"):
        return value

    return None


def _normalize_product_images(product):
    """Normalize image_urls and image_url fields on a product dict."""
    if not isinstance(product, dict):
        return product

    normalized = product.copy()

    image_urls = normalized.get("image_urls")
    cleaned_image_urls = []
    if isinstance(image_urls, list):
        cleaned_image_urls = [
            url
            for url in (_normalize_image_url(u) for u in image_urls)
            if url is not None
        ]
    normalized["image_urls"] = cleaned_image_urls

    image_url = normalized.get("image_url")
    primary = _normalize_image_url(image_url) if isinstance(image_url, str) else None
    if not primary and cleaned_image_urls:
        primary = cleaned_image_urls[0]
    normalized["image_url"] = primary

    return normalized


def _normalize_logo_metadata(product):
    """Normalize logo metadata into a consistent API shape."""
    if not isinstance(product, dict):
        return product

    normalized = product.copy()
    logo_verification = _extract_logo_verification(normalized.get("logo_verification"))
    logo_visible = _parse_logo_visible(normalized.get("logo_visible"))

    # A valid verification payload implies a visible logo even if legacy records
    # never stored the visibility flag.
    if logo_verification is not None:
        logo_visible = True

    normalized["logo_visible"] = logo_visible if isinstance(logo_visible, bool) else None
    normalized["logo_status"] = _compute_logo_status(logo_visible, logo_verification)
    normalized["logo_verify_status"] = _compute_logo_verify_status(logo_visible, logo_verification)

    if logo_verification is not None:
        normalized["logo_verification"] = logo_verification

    return normalized


def _normalize_product_record(product):
    """Normalize a product for API responses."""
    if not isinstance(product, dict):
        return product

    return _normalize_logo_metadata(_normalize_product_images(product))


def _get_product_owner_id(product):
    """Return the best-available owner identifier for a product."""
    if not isinstance(product, dict):
        return None

    return product.get("user_id") or product.get("seller_id") or product.get("owner_id")


def _persist_product_updates(product_id, updates, clear_fields=None):
    """Persist partial product updates and optionally delete fields."""
    try:
        ref = db.reference(f"products/{product_id}")
        payload = (updates or {}).copy()
        payload["updated_at"] = datetime.now().isoformat()
        ref.update(payload)

        for field in clear_fields or []:
            ref.child(field).delete()

        return True
    except Exception as exc:
        print(f"ERROR: Error updating products/{product_id}: {exc}")
        return False


def _collect_product_image_urls(product):
    """Collect product image URLs from image_urls and image_url fields."""
    if not isinstance(product, dict):
        return []

    urls = []

    image_urls = product.get("image_urls")
    if isinstance(image_urls, list):
        for url in image_urls:
            if isinstance(url, str) and url.strip():
                urls.append(url.strip())

    image_url = product.get("image_url")
    if isinstance(image_url, str) and image_url.strip():
        urls.append(image_url.strip())

    unique_urls = []
    seen = set()
    for url in urls:
        if url not in seen:
            seen.add(url)
            unique_urls.append(url)

    return unique_urls


def _parse_image_urls_field(raw_image_urls):
    """Parse image_urls from JSON payloads or form fields."""
    if isinstance(raw_image_urls, list):
        return raw_image_urls

    if isinstance(raw_image_urls, str):
        value = raw_image_urls.strip()
        if not value:
            return []
        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                return []
        return [value]

    return []


def compute_similarity_score(base, candidate):
    """Advanced similarity score for product recommendations."""
    if base.get("id") == candidate.get("id"):
        return -1.0

    score = 0.0

    b_cat = str(base.get("category", "")).lower()
    c_cat = str(candidate.get("category", "")).lower()
    if b_cat and b_cat == c_cat:
        score += 25.0

    b_brand = str(base.get("brand", "")).lower()
    c_brand = str(candidate.get("brand", "")).lower()
    if b_brand and c_brand and b_brand == c_brand:
        score += 12.0

    b_title_words = set(str(base.get("title", "")).lower().replace("-", " ").split())
    c_title_words = set(str(candidate.get("title", "")).lower().replace("-", " ").split())
    intersection = b_title_words.intersection(c_title_words)
    score += len(intersection) * 4.0

    try:
        p1 = float(base.get("price", 0))
        p2 = float(candidate.get("price", 0))
        if p1 > 0.0 and p2 > 0.0:
            diff_ratio = float(abs(p1 - p2) / max(p1, p2, 1.0))
            score += max(0.0, float(15.0 * (1.0 - diff_ratio)))
    except Exception:
        pass

    cond_rank = {"new": 5, "like new": 4, "excellent": 4, "good": 3, "fair": 2, "poor": 1}
    b_cond = cond_rank.get(str(base.get("condition", "")).lower(), 3)
    c_cond = cond_rank.get(str(candidate.get("condition", "")).lower(), 3)
    score -= abs(b_cond - c_cond) * 2.0

    return score


# ------------------------ IMAGE UPLOAD ------------------------

@product_bp.route("/upload-image", methods=["POST"])
def upload_image():
    """Upload a single product image to Cloudinary."""
    try:
        if "image" not in request.files:
            return jsonify({"success": False, "error": "No image provided"}), 400

        file = request.files["image"]

        if not file.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"success": False, "error": "Invalid image type"}), 400

        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"

        try:
            url = _upload_to_cloudinary(file, unique_filename)
        except Exception as exc:
            return jsonify({"success": False, "error": f"Cloudinary upload failed: {exc}"}), 500

        if not url:
            return jsonify({"success": False, "error": "Cloudinary did not return image URL"}), 500

        return jsonify(
            {
                "success": True,
                "filename": unique_filename,
                "url": url,
                "filepath": url,
            }
        ), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@product_bp.route("/upload-images", methods=["POST"])
def upload_images():
    """Upload multiple product images to Cloudinary."""
    try:
        if "images" not in request.files:
            return jsonify({"success": False, "error": "No images provided"}), 400

        files = request.files.getlist("images")
        if not files:
            return jsonify({"success": False, "error": "No files selected"}), 400

        uploaded_urls = []

        for file in files:
            if not file.filename or not allowed_file(file.filename):
                continue

            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"

            try:
                url = _upload_to_cloudinary(file, unique_filename)
                if not url:
                    return jsonify({"success": False, "error": "Cloudinary did not return image URL"}), 500
                uploaded_urls.append(url)
            except Exception as exc:
                return jsonify({"success": False, "error": f"Cloudinary upload failed for {filename}: {exc}"}), 500

        return jsonify({"success": True, "urls": uploaded_urls}), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ CREATE LISTING ------------------------

@product_bp.route("/listings", methods=["POST"])
@token_required
def create_listing(current_user):
    """Create a new product listing; supports JSON or multipart form with images."""
    try:
        data = request.get_json(silent=True) if request.is_json else None
        if not isinstance(data, dict):
            data = request.form.to_dict() if request.form else {}

        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        required = ["title", "price", "category", "description"]
        for field in required:
            val = data.get(field)
            if not val or (isinstance(val, str) and not val.strip()):
                return jsonify({"success": False, "error": f"Missing or empty required field: {field}"}), 400

        try:
            price = float(data["price"])
            if price <= 0:
                return jsonify({"success": False, "error": "Price must be greater than zero."}), 400
            if price > 10000000:
                return jsonify({"success": False, "error": "Price is unrealistically high."}), 400

            curr_year = datetime.now().year
            year = int(data.get("year", curr_year))
            if year < 1900 or year > curr_year:
                return jsonify({"success": False, "error": f"Year must be between 1900 and {curr_year}."}), 400
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Price and Year must be valid numbers."}), 400

        normalized_image_urls = []

        uploaded_files = request.files.getlist("images")
        has_uploaded_files = any(file and file.filename for file in uploaded_files)

        if has_uploaded_files:
            for file in uploaded_files:
                if not file or not file.filename:
                    continue
                if not allowed_file(file.filename):
                    return jsonify({"success": False, "error": f"Invalid image type: {file.filename}"}), 400

                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4()}_{filename}"
                try:
                    url = _upload_to_cloudinary(file, unique_filename)
                except Exception as exc:
                    return jsonify({"success": False, "error": f"Cloudinary upload failed for {filename}: {exc}"}), 500

                if not url:
                    return jsonify({"success": False, "error": f"Cloudinary did not return URL for {filename}"}), 500

                normalized_image_urls.append(url)
        else:
            raw_image_urls = _parse_image_urls_field(data.get("image_urls", []))
            for raw_url in raw_image_urls:
                normalized = _normalize_image_url(raw_url)
                if not normalized:
                    return jsonify(
                        {
                            "success": False,
                            "error": "Image must be uploaded via /upload-image or /upload-images first.",
                        }
                    ), 400
                normalized_image_urls.append(normalized)

        new_product = {
            "title": str(data["title"]).strip(),
            "price": price,
            "category": str(data["category"]).strip(),
            "description": str(data["description"]).strip(),
            "brand": str(data.get("brand", "")).strip(),
            "condition": str(data.get("condition", "good")).lower(),
            "year": year,
            "image_urls": normalized_image_urls,
            "image_url": normalized_image_urls[0] if normalized_image_urls else None,
            "created_at": datetime.now().isoformat(),
            "user_id": current_user["uid"],
        }

        logo_visible = _parse_logo_visible(data.get("logo_visible"))
        logo_verification = _extract_logo_verification(data.get("logo_verification"))

        if logo_visible is None:
            new_product["logo_status"] = "unknown"
            new_product["logo_verify_status"] = "unknown"
        elif logo_visible is False:
            new_product["logo_visible"] = False
            new_product["logo_status"] = _compute_logo_status(False, None)
            new_product["logo_verify_status"] = _compute_logo_verify_status(False, None)
        else:
            new_product["logo_visible"] = True
            if logo_verification is not None:
                new_product["logo_verification"] = logo_verification
            new_product["logo_status"] = _compute_logo_status(True, logo_verification)
            new_product["logo_verify_status"] = _compute_logo_verify_status(True, logo_verification)

        product_id = str(uuid.uuid4())
        success = ProductsAPI.create(product_id, new_product)

        if success:
            created_product = ProductsAPI.get_by_id(product_id) or new_product.copy()
            created_product["id"] = product_id
            return jsonify({"success": True, "product": _normalize_product_record(created_product)}), 200
        return jsonify({"success": False, "error": "Database save failed"}), 500

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ GET ALL LISTINGS ------------------------

@product_bp.route("/listings", methods=["GET"])
def get_listings():
    """Return all products with optional filtering."""
    try:
        products = ProductsAPI.get_all()

        category = request.args.get("category")
        min_price = request.args.get("min_price")
        max_price = request.args.get("max_price")
        search = request.args.get("search")

        filtered = products

        if category:
            filtered = [p for p in filtered if str(p.get("category", "")).lower() == category.lower()]

        if min_price:
            try:
                m_p = float(min_price)
                filtered = [p for p in filtered if float(p.get("price", 0)) >= m_p]
            except Exception:
                pass

        if max_price:
            try:
                mx_p = float(max_price)
                filtered = [p for p in filtered if float(p.get("price", 0)) <= mx_p]
            except Exception:
                pass

        seller_id = request.args.get("seller_id")
        if seller_id:
            filtered = [p for p in filtered if str(p.get("user_id", "")).lower() == str(seller_id).lower()]

        if search:
            search_term = search.lower()
            scored_products = []
            for p in filtered:
                score = 0
                title_lower = str(p.get("title", "")).lower()
                desc_lower = str(p.get("description", "")).lower()

                if search_term == title_lower:
                    score += 100
                elif title_lower.startswith(search_term):
                    score += 50
                elif search_term in title_lower:
                    score += 20

                if search_term in desc_lower:
                    score += 10

                if score > 0:
                    p["_search_score"] = score
                    scored_products.append(p)

            scored_products.sort(key=lambda x: x.get("_search_score", 0), reverse=True)
            for p in scored_products:
                p.pop("_search_score", None)
            filtered = scored_products

        filtered = [_normalize_product_record(p) for p in filtered]

        return jsonify({
            "success": True,
            "products": filtered,
            "total": len(filtered),
        }), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ GET SINGLE PRODUCT ------------------------

@product_bp.route("/listings/<product_id>", methods=["GET"])
def get_product(product_id):
    """Return one product by ID."""
    try:
        product = ProductsAPI.get_by_id(product_id)

        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        product = _normalize_product_record(product)

        return jsonify({"success": True, "product": product}), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@product_bp.route("/listings/<product_id>/logo-visibility", methods=["PATCH"])
@token_required
def update_listing_logo_visibility(current_user, product_id):
    """Persist owner-confirmed logo visibility for a listing."""
    try:
        product = ProductsAPI.get_by_id(product_id)
        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        owner_id = _get_product_owner_id(product)
        if not owner_id or str(owner_id) != str(current_user.get("uid")):
            return jsonify({"success": False, "error": "Not authorized"}), 403

        data = request.get_json(silent=True) if request.is_json else None
        if not isinstance(data, dict):
            data = request.form.to_dict() if request.form else {}

        logo_visible = _parse_logo_visible(data.get("logo_visible"))
        if logo_visible is None:
            return jsonify({"success": False, "error": "logo_visible must be true or false"}), 400

        existing_verification = _extract_logo_verification(product.get("logo_verification"))
        if logo_visible is False:
            updates = {
                "logo_visible": False,
                "logo_status": _compute_logo_status(False, None),
                "logo_verify_status": _compute_logo_verify_status(False, None),
            }
            clear_fields = ["logo_verification", "logo_verified_at"]
        else:
            updates = {
                "logo_visible": True,
                "logo_status": _compute_logo_status(True, existing_verification),
                "logo_verify_status": _compute_logo_verify_status(True, existing_verification),
            }
            clear_fields = None

        if not _persist_product_updates(product_id, updates, clear_fields=clear_fields):
            return jsonify({"success": False, "error": "Database update failed"}), 500

        updated_product = ProductsAPI.get_by_id(product_id)
        if not updated_product:
            return jsonify({"success": False, "error": "Product not found after update"}), 500

        return jsonify({
            "success": True,
            "product": _normalize_product_record(updated_product),
        }), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ VERIFY LISTING LOGO ------------------------

@product_bp.route("/listings/<product_id>/logo/verify", methods=["POST"])
@token_required
def verify_listing_logo(current_user, product_id):
    """Verify a listing's logo and persist the result.

    Owner-only endpoint.
    Expects multipart form-data with `image`.
    """
    try:
        product = ProductsAPI.get_by_id(product_id)
        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        owner_id = _get_product_owner_id(product)
        if not owner_id or str(owner_id) != str(current_user.get("uid")):
            return jsonify({"success": False, "error": "Not authorized"}), 403

        if _parse_logo_visible(product.get("logo_visible")) is False:
            return jsonify({"success": False, "error": "Logo is marked as not present"}), 400

        if "image" not in request.files:
            return jsonify({"success": False, "error": "Image is required"}), 400

        image_file = request.files["image"]
        if not image_file or not image_file.filename:
            return jsonify({"success": False, "error": "No file selected"}), 400

        if not allowed_file(image_file.filename):
            return jsonify({"success": False, "error": "Invalid image type"}), 400

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        safe_name = secure_filename(image_file.filename)
        extension = safe_name.rsplit(".", 1)[-1].lower()
        temp_path = os.path.join(UPLOAD_FOLDER, f"logo_verify_{uuid.uuid4()}.{extension}")
        image_file.save(temp_path)

        try:
            from ml_services.logo_verifier import verify_logo as run_verify_logo
        except Exception as exc:
            return jsonify({"success": False, "error": f"Logo verification unavailable: {exc}"}), 503

        brand_hint = request.form.get("brand") or request.args.get("brand")
        result = run_verify_logo(temp_path, brand_hint)

        try:
            os.remove(temp_path)
        except OSError:
            pass

        # Mirror /api/logo/verify behavior: always return model response payload
        if not isinstance(result, dict):
            return jsonify({"success": False, "error": "Logo verification failed"}), 200

        if result.get("success") and isinstance(result.get("is_genuine"), bool):
            updates = {
                "logo_visible": True,
                "logo_verification": result,
                "logo_status": _compute_logo_status(True, result),
                "logo_verify_status": _compute_logo_verify_status(True, result),
                "logo_verified_at": datetime.now().isoformat(),
            }

            if not _persist_product_updates(product_id, updates):
                return jsonify({"success": False, "error": "Database update failed"}), 500

            updated = ProductsAPI.get_by_id(product_id)
            if not updated:
                return jsonify({"success": False, "error": "Product not found after update"}), 500
            updated = _normalize_product_record(updated)

            return jsonify({"success": True, "product": updated, "verification": result}), 200

        return jsonify(result), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ DELETE PRODUCT ------------------------

@product_bp.route("/listings/<product_id>", methods=["DELETE"])
def delete_listing(product_id):
    """Delete a product by ID and clean up Cloudinary images."""
    try:
        product = ProductsAPI.get_by_id(product_id)

        if not product:
            return jsonify({"success": False, "error": "Product not found"}), 404

        delete_errors = []
        for image_url in _collect_product_image_urls(product):
            success, error = _delete_cloudinary_image(image_url)
            if not success:
                delete_errors.append({"url": image_url, "error": error})

        if delete_errors:
            return jsonify({
                "success": False,
                "error": "Failed to delete one or more Cloudinary images",
                "details": delete_errors,
            }), 500

        success = ProductsAPI.delete(product_id)

        if success:
            return jsonify({"success": True, "product": product}), 200
        return jsonify({"success": False, "error": "Database deletion failed"}), 500

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ GET MY LISTINGS ------------------------

@product_bp.route("/my-listings", methods=["GET"])
@token_required
def get_my_listings(current_user):
    """Get all products listed by the current authenticated user."""
    try:
        user_id = current_user.get("uid")
        if not user_id:
            return jsonify({"success": False, "error": "User not authenticated"}), 401

        products = ProductsAPI.get_all()
        my_products = [p for p in products if str(p.get("user_id", "")).lower() == str(user_id).lower()]
        my_products = [_normalize_product_record(p) for p in my_products]
        my_products.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return jsonify({
            "success": True,
            "products": my_products,
            "total": len(my_products),
        }), 200

    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ------------------------ HEALTH CHECK ------------------------

@product_bp.route("/health", methods=["GET"])
def health_check():
    """Simple health status."""
    return jsonify({
        "success": True,
        "service": "Product Listings API",
        "status": "running",
    }), 200


# ------------------------ RECOMMENDATIONS ------------------------

@product_bp.route("/listings/<product_id>/recommendations", methods=["GET"])
def recommend_products(product_id):
    """Return similar products using hybrid recommendation logic."""
    try:
        from ml_services.image_search import search_similar_images

        products = ProductsAPI.get_all()
        base = ProductsAPI.get_by_id(product_id)
        if not base:
            return jsonify({"success": False, "error": "Product not found"}), 404

        scored_map = {}
        for candidate in products:
            cid = str(candidate.get("id"))
            if cid == str(product_id):
                continue
            if candidate.get("status") == "sold":
                continue

            score = float(compute_similarity_score(base, candidate))
            if score > 0:
                scored_map[cid] = {"data": candidate, "score": score}

        base_primary = _normalize_product_record(base).get("image_url")
        if base_primary:
            filename = os.path.basename(base_primary)
            local_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(local_path):
                visual_result = search_similar_images(local_path, top_k=15)
                if visual_result.get("success"):
                    for vis_item in visual_result.get("results", []):
                        vis_id = str(vis_item.get("product_id"))
                        if vis_id in scored_map:
                            match_meta = scored_map[vis_id]
                            visual_sim = float(vis_item.get("similarity_score", 0.0))
                            boost = float(visual_sim * 20.0)
                            current_score = float(match_meta.get("score", 0.0))
                            match_meta["score"] = current_score + boost
                            match_meta["is_visual_match"] = True

        final_scored = list(scored_map.values())
        final_scored.sort(key=lambda x: x["score"], reverse=True)

        recommendations = [
            _normalize_product_record(item.get("data"))
            for item in final_scored[:6]
            if isinstance(item, dict)
        ]

        return jsonify({
            "success": True,
            "recommendations": recommendations,
            "count": len(recommendations),
            "engine": "v2.5-hybrid-ml-recommender",
        }), 200

    except Exception as exc:
        print(f"DEBUG: Recommendation error: {str(exc)}")
        return jsonify({"success": False, "error": str(exc)}), 500
