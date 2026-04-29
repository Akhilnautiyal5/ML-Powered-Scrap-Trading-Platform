"""
Firebase Database Utilities
Helper functions for managing Firebase Realtime Database operations
"""

from firebase_admin import db
import json
from datetime import datetime
from typing import Dict, List, Optional, Any


class FirebaseDB:
    """Firebase Realtime Database helper class"""
    
    @staticmethod
    def get_all(ref_path: str) -> Optional[Dict]:
        """Get all data from a reference path"""
        try:
            ref = db.reference(ref_path)
            data = ref.get()
            return data or {}
        except Exception as e:
            print(f"Error retrieving data from {ref_path}: {e}")
            return None
    
    @staticmethod
    def get_one(ref_path: str, item_id: str) -> Optional[Dict]:
        """Get a single item by ID"""
        try:
            ref = db.reference(f'{ref_path}/{item_id}')
            data = ref.get()
            if data:
                data['id'] = item_id  # Add ID to response
            return data
        except Exception as e:
            print(f"Error retrieving {ref_path}/{item_id}: {e}")
            return None
    
    @staticmethod
    def create(ref_path: str, item_id: str, data: Dict) -> bool:
        """Create a new item"""
        try:
            # Add timestamps
            data['created_at'] = datetime.now().isoformat()
            data['updated_at'] = datetime.now().isoformat()
            
            ref = db.reference(f'{ref_path}/{item_id}')
            ref.set(data)
            print(f"SUCCESS: Created {ref_path}/{item_id}")
            return True
        except Exception as e:
            print(f"ERROR: Error creating {ref_path}/{item_id}: {e}")
            return False
    
    @staticmethod
    def update(ref_path: str, item_id: str, data: Dict) -> bool:
        """Update an existing item"""
        try:
            # Add update timestamp
            data['updated_at'] = datetime.now().isoformat()
            
            ref = db.reference(f'{ref_path}/{item_id}')
            ref.update(data)
            print(f"SUCCESS: Updated {ref_path}/{item_id}")
            return True
        except Exception as e:
            print(f"ERROR: Error updating {ref_path}/{item_id}: {e}")
            return False
    
    @staticmethod
    def delete(ref_path: str, item_id: str) -> bool:
        """Delete an item"""
        try:
            ref = db.reference(f'{ref_path}/{item_id}')
            ref.delete()
            print(f"SUCCESS: Deleted {ref_path}/{item_id}")
            return True
        except Exception as e:
            print(f"ERROR: Error deleting {ref_path}/{item_id}: {e}")
            return False
    
    @staticmethod
    def query_filter(ref_path: str, key: str, value: Any) -> Optional[List[Dict]]:
        """Filter items by a specific key-value pair"""
        try:
            data = FirebaseDB.get_all(ref_path)
            if not data:
                return []
            
            results = []
            for item_id, item_data in data.items():
                if item_data.get(key) == value:
                    item_data['id'] = item_id
                    results.append(item_data)
            
            return results
        except Exception as e:
            print(f"Error filtering {ref_path}: {e}")
            return []
    
    @staticmethod
    def add_child(ref_path: str, parent_id: str, child_key: str, child_data: Dict) -> bool:
        """Add a child element to a parent"""
        try:
            ref = db.reference(f'{ref_path}/{parent_id}/{child_key}')
            ref.set(child_data)
            print(f"SUCCESS: Added child to {ref_path}/{parent_id}/{child_key}")
            return True
        except Exception as e:
            print(f"ERROR: Error adding child: {e}")
            return False
    
    @staticmethod
    def get_child(ref_path: str, parent_id: str, child_key: str) -> Optional[Dict]:
        """Get a specific child element"""
        try:
            ref = db.reference(f'{ref_path}/{parent_id}/{child_key}')
            data = ref.get()
            return data
        except Exception as e:
            print(f"Error retrieving child: {e}")
            return None
    
    @staticmethod
    def delete_child(ref_path: str, parent_id: str, child_key: str) -> bool:
        """Delete a child element"""
        try:
            ref = db.reference(f'{ref_path}/{parent_id}/{child_key}')
            ref.delete()
            print(f"SUCCESS: Deleted child {ref_path}/{parent_id}/{child_key}")
            return True
        except Exception as e:
            print(f"ERROR: Error deleting child: {e}")
            return False


# ====================
# Domain-Specific APIs
# ====================

class ProductsAPI:
    """Products collection operations"""
    
    @staticmethod
    def get_all():
        """Get all products"""
        products = FirebaseDB.get_all('products')
        if not products:
            return []

        results = []
        for product_id, product_data in products.items():
            if isinstance(product_data, dict):
                item = product_data.copy()
                item['id'] = product_id
            else:
                item = {'id': product_id, 'value': product_data}
            results.append(item)

        return results
    
    @staticmethod
    def get_by_id(product_id: str):
        """Get product by ID"""
        return FirebaseDB.get_one('products', product_id)
    
    @staticmethod
    def get_by_user(user_id: str):
        """Get all products by a user"""
        return FirebaseDB.query_filter('products', 'user_id', user_id)
    
    @staticmethod
    def get_by_category(category: str):
        """Get products by category"""
        return FirebaseDB.query_filter('products', 'category', category)
    
    @staticmethod
    def create(product_id: str, product_data: Dict):
        """Create new product"""
        return FirebaseDB.create('products', product_id, product_data)
    
    @staticmethod
    def update(product_id: str, updates: Dict):
        """Update product"""
        return FirebaseDB.update('products', product_id, updates)
    
    @staticmethod
    def delete(product_id: str):
        """Delete product"""
        return FirebaseDB.delete('products', product_id)


class EscrowAPI:
    """Escrow records operations"""
    
    @staticmethod
    def get_all():
        """Get all escrow records"""
        escrow = FirebaseDB.get_all('escrow')
        return list(escrow.values()) if escrow else []
    
    @staticmethod
    def get_by_id(escrow_id: str):
        """Get escrow record by ID"""
        return FirebaseDB.get_one('escrow', escrow_id)
    
    @staticmethod
    def get_by_user(user_id: str):
        """Get escrow records involving a user"""
        escrow = FirebaseDB.get_all('escrow')
        if not escrow:
            return []
        
        results = []
        for escrow_id, record in escrow.items():
            if record.get('buyer_id') == user_id or record.get('seller_id') == user_id:
                record['id'] = escrow_id
                results.append(record)
        return results
    
    @staticmethod
    def create(escrow_id: str, escrow_data: Dict):
        """Create escrow record"""
        return FirebaseDB.create('escrow', escrow_id, escrow_data)
    
    @staticmethod
    def update(escrow_id: str, updates: Dict):
        """Update escrow record"""
        return FirebaseDB.update('escrow', escrow_id, updates)
    
    @staticmethod
    def add_timeline_event(escrow_id: str, event: Dict):
        """Add timeline event to escrow"""
        try:
            ref = db.reference(f'escrow/{escrow_id}/timeline')
            timeline = ref.get() or []
            timeline.append(event)
            ref.set(timeline)
            return True
        except Exception as e:
            print(f"Error adding timeline event: {e}")
            return False


class FeedbackAPI:
    """Feedback operations"""
    
    @staticmethod
    def get_product_feedback(product_id: str):
        """Get feedback for a product"""
        feedback = FirebaseDB.get_all('feedback/product')
        if not feedback:
            return []
        
        results = []
        for fb_id, fb_data in feedback.items():
            if fb_data.get('product_id') == product_id:
                fb_data['id'] = fb_id
                results.append(fb_data)
        return results
    
    @staticmethod
    def add_product_feedback(feedback_id: str, feedback_data: Dict):
        """Add feedback to product"""
        return FirebaseDB.create('feedback/product', feedback_id, feedback_data)
    
    @staticmethod
    def get_general_feedback():
        """Get all general feedback"""
        feedback = FirebaseDB.get_all('feedback/general')
        return list(feedback.values()) if feedback else []
    
    @staticmethod
    def add_general_feedback(feedback_id: str, feedback_data: Dict):
        """Add general feedback"""
        return FirebaseDB.create('feedback/general', feedback_id, feedback_data)


class MessagesAPI:
    """Messaging operations"""
    
    @staticmethod
    def get_all_threads():
        """Get all message threads"""
        threads = FirebaseDB.get_all('messages')
        return list(threads.values()) if threads else []
    
    @staticmethod
    def get_thread(thread_id: str):
        """Get specific message thread"""
        return FirebaseDB.get_one('messages', thread_id)
    
    @staticmethod
    def get_user_threads(user_id: str):
        """Get all threads involving a user"""
        threads = FirebaseDB.get_all('messages')
        if not threads:
            return []
        
        results = []
        for thread_id, thread_data in threads.items():
            if thread_data.get('buyer_id') == user_id or thread_data.get('seller_id') == user_id:
                thread_data['id'] = thread_id
                results.append(thread_data)
        return results
    
    @staticmethod
    def add_message(thread_id: str, message_id: str, message_data: Dict):
        """Add message to thread"""
        try:
            ref = db.reference(f'messages/{thread_id}/messages/{message_id}')
            ref.set(message_data)
            
            # Update thread's updated_at
            db.reference(f'messages/{thread_id}/updated_at').set(datetime.now().isoformat())
            return True
        except Exception as e:
            print(f"Error adding message: {e}")
            return False
    
    @staticmethod
    def create_thread(thread_id: str, thread_data: Dict):
        """Create new message thread"""
        return FirebaseDB.create('messages', thread_id, thread_data)

class AIPredictionsAPI:
    """AI Prediction Logs operations"""
    
    @staticmethod
    def log_prediction(prediction_id: str, data: Dict):
        """Log a new ML prediction"""
        return FirebaseDB.create('ai_predictions', prediction_id, data)
        
    @staticmethod
    def get_by_model(model_name: str):
        """Get predictions by model used"""
        return FirebaseDB.query_filter('ai_predictions', 'model_used', model_name)
        
    @staticmethod
    def update_feedback(prediction_id: str, feedback: bool):
        """Update user feedback for a prediction"""
        return FirebaseDB.update('ai_predictions', prediction_id, {'user_feedback': feedback})

class WalletAPI:
    """User Wallet operations"""
    
    @staticmethod
    def get_balance(user_id: str):
        """Get user wallet balance"""
        wallet = FirebaseDB.get_one('wallets', user_id)
        if not wallet:
            # Initialize empty wallet
            wallet = {'balance': 0.0, 'currency': 'INR', 'last_updated_at': datetime.now().isoformat()}
            FirebaseDB.create('wallets', user_id, wallet)
        return wallet
        
    @staticmethod
    def add_transaction(transaction_id: str, user_id: str, amount: float, t_type: str, status: str = "COMPLETED"):
        """Record wallet transaction and update balance"""
        data = {
            'user_id': user_id,
            'amount': amount,
            'type': t_type,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        success = FirebaseDB.create('wallet_transactions', transaction_id, data)
        if success and status == "COMPLETED":
            # Update wallet balance atomically
            try:
                ref = db.reference(f'wallets/{user_id}/balance')
                ref.transaction(lambda current_bal: (current_bal or 0.0) + amount)
            except Exception as e:
                print(f"Error updating wallet balance: {e}")
                return False
        return success

class DisputesAPI:
    """Dispute operations for Escrows"""
    
    @staticmethod
    def open_dispute(dispute_id: str, data: Dict):
        """Open a new dispute"""
        return FirebaseDB.create('disputes', dispute_id, data)
        
    @staticmethod
    def get_by_escrow(escrow_id: str):
        """Get dispute by associated escrow"""
        return FirebaseDB.query_filter('disputes', 'escrow_id', escrow_id)
        
    @staticmethod
    def resolve_dispute(dispute_id: str, resolution: str):
        """Resolve a dispute"""
        updates = {
            'status': 'RESOLVED',
            'admin_resolution': resolution,
            'resolved_at': datetime.now().isoformat()
        }
        return FirebaseDB.update('disputes', dispute_id, updates)

class UserRatingsAPI:
    """Peer-to-peer user ratings operations"""
    
    @staticmethod
    def add_rating(rating_id: str, data: Dict):
        """Add a new user rating"""
        return FirebaseDB.create('user_ratings', rating_id, data)
        
    @staticmethod
    def get_user_ratings(user_id: str):
        """Get all ratings received by a user"""
        return FirebaseDB.query_filter('user_ratings', 'reviewee_id', user_id)
        
    @staticmethod
    def get_trust_score(user_id: str):
        """Calculate average trust score for a user"""
        ratings = UserRatingsAPI.get_user_ratings(user_id)
        if not ratings:
            return 0.0
        total_score = sum(float(r.get('rating', 0)) for r in ratings)
        return total_score / len(ratings)

class CategoriesAPI:
    """Standardized Product Categories operations"""
    
    @staticmethod
    def get_all():
        """Get all standard product categories"""
        categories = FirebaseDB.get_all('categories')
        return list(categories.values()) if categories else []
        
    @staticmethod
    def add_category(category_id: str, data: Dict):
        """Add a new standard category"""
        return FirebaseDB.create('categories', category_id, data)
        
    @staticmethod
    def update_price(category_id: str, price: float):
        """Update average market value for a category"""
        return FirebaseDB.update('categories', category_id, {'average_market_value': price})

class ShipmentsAPI:
    """Logistics and shipment tracking operations"""
    
    @staticmethod
    def create_shipment(shipment_id: str, data: Dict):
        """Create a new shipment record"""
        return FirebaseDB.create('shipments', shipment_id, data)
        
    @staticmethod
    def get_by_escrow(escrow_id: str):
        """Get shipment by escrow Id"""
        return FirebaseDB.query_filter('shipments', 'escrow_id', escrow_id)
        
    @staticmethod
    def update_status(shipment_id: str, status: str, location: str = ""):
        """Update shipment status/location"""
        updates = {
            'status': status,
            'current_location': location,
            'last_updated': datetime.now().isoformat()
        }
        return FirebaseDB.update('shipments', shipment_id, updates)

class WatchlistAPI:
    """User product watchlist operations"""
    
    @staticmethod
    def add_to_watchlist(user_id: str, product_id: str, target_price: float = 0.0):
        """Add product to user watchlist"""
        data = {
            'product_id': product_id,
            'target_price': target_price,
            'added_at': datetime.now().isoformat()
        }
        return FirebaseDB.add_child('watchlists', user_id, product_id, data)
        
    @staticmethod
    def remove_from_watchlist(user_id: str, product_id: str):
        """Remove product from watchlist"""
        return FirebaseDB.delete_child('watchlists', user_id, product_id)
        
    @staticmethod
    def get_user_watchlist(user_id: str):
        """Get user's full watchlist"""
        watchlist = FirebaseDB.get_all(f'watchlists/{user_id}')
        return list(watchlist.values()) if watchlist else []
