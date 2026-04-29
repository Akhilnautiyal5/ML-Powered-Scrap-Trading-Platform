# server/routes/image_routes.py
"""
Image-based search routes.
Handles uploading an image and finding visually similar products.
"""

from flask import Blueprint, request, jsonify, send_from_directory
import os
import uuid
from pathlib import Path
from ml_services.image_search.search_engine import search_similar_images

# Blueprint for image search routes
image_bp = Blueprint('image', __name__, url_prefix='/api/image')


@image_bp.route('/search', methods=['POST'])
def image_search():
    """Receives an image file and returns visually similar product matches."""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file provided.'}), 400

        image_file = request.files['image']

        # Validate file
        if not image_file.filename:
            return jsonify({'success': False, 'error': 'No image selected.'}), 400

        allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'bmp'}
        extension = image_file.filename.rsplit('.', 1)[-1].lower()

        if extension not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: jpg, jpeg, png, gif, bmp.'
            }), 400

        # Save image temporarily
        upload_dir = 'uploads'
        os.makedirs(upload_dir, exist_ok=True)

        unique_filename = f"{uuid.uuid4()}.{extension}"
        filepath = os.path.join(upload_dir, unique_filename)
        image_file.save(filepath)

        # Run similarity search
        search_result = search_similar_images(filepath, top_k=5)

        # Make returned image URLs usable directly in the browser UI
        try:
            if isinstance(search_result, dict) and search_result.get("success"):
                base = request.host_url.rstrip("/")
                for item in search_result.get("results", []) or []:
                    url = item.get("image_url")
                    if isinstance(url, str) and url.startswith("/api/"):
                        item["image_url"] = base + url
                    # If it's already a full URL (like Cloudinary), we don't need to do anything
        except Exception:
            pass

        # Remove temporary file
        try:
            os.remove(filepath)
        except:
            pass  # Not important for production use

        return jsonify(search_result), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@image_bp.route('/health', methods=['GET'])
def health_check():
    """Simple health check for image search service."""
    return jsonify({
        'success': True,
        'service': 'Image Search API',
        'status': 'running'
    }), 200


@image_bp.route('/dataset/<category>/<filename>', methods=['GET'])
def serve_dataset_image(category, filename):
    """Expose curated dataset assets for the visual search UI."""
    base_dir = (
        Path(__file__).resolve().parents[2]
        / "Dataset"
        / "products"
        / category
    )
    if not base_dir.exists():
        return jsonify({'success': False, 'error': 'Dataset category not found'}), 404

    file_path = base_dir / filename
    if not file_path.exists():
        return jsonify({'success': False, 'error': 'Dataset image not found'}), 404

    return send_from_directory(str(base_dir), filename)
