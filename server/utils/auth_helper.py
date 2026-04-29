import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from firebase_admin import db

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Get token from Authorization header or 'x-access-token'
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1] if "Bearer" in request.headers['Authorization'] else request.headers['Authorization']
        if not token:
            return jsonify({'message': 'Authentication token is missing!', 'success': False}), 401
        
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            # Load user from Firebase to ensure they still exist
            user_ref = db.reference(f"users/{data['user_id']}")
            current_user = user_ref.get()
            if not current_user:
                return jsonify({'message': 'Invalid authentication token!', 'success': False}), 401
            # Add uid back as it's the key
            current_user['uid'] = data['user_id']
        except Exception as e:
            return jsonify({'message': f'Invalid authentication token: {str(e)}', 'success': False}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated
