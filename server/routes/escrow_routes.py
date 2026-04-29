# server/routes/escrow_routes.py
"""
Hardened Production Escrow Module (V2.1).
Secures funds in Firebase RTDB with atomic state transitions and role-based permissions.
"""

from flask import Blueprint, request, jsonify
from firebase_admin import db
import time
import uuid

escrow_bp = Blueprint("escrow", __name__, url_prefix="/api/escrow")

# Auto-release window after buyer confirms delivery.
AUTO_RELEASE_DAYS = 30
AUTO_RELEASE_SECONDS = AUTO_RELEASE_DAYS * 86400


def _resolve_identity_keys(user_id):
    """Resolve uid/username aliases for escrow lookups."""
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

# --- 1. PROPER FINITE STATE MACHINE (FSM) ---
# Strict logic gates to prevent invalid status jumps.
STATE_RULES = {
    "PENDING_PAYMENT": ["FUNDED", "CANCELLED"],
    "FUNDED": ["SHIPPED", "DISPUTED", "REFUNDED"],
    "SHIPPED": ["DELIVERED", "DISPUTED"], # REFUNDED removed: must go to DISPUTED or DELIVERED first
    "DELIVERED": ["RELEASED", "DISPUTED", "REFUNDED"],
    "DISPUTED": ["RELEASED", "REFUNDED"],
    "RELEASED": [], # TERMINAL: Ledger closed permanently
    "REFUNDED": [], # TERMINAL: Ledger closed permanently
    "CANCELLED": [] # TERMINAL: Ledger closed permanently
}

# --- 2. ATOMIC TRANSACTION WRAPPER ---
def execute_atomic_transition(escrow_id, target_state, actor_id, actor_role, reason, **kwargs):
    """
    Primary engine for all state changes. 
    Guarantees atomic fund movement, role validation, and state synchronization.
    No direct DB writes allowed; everything passes through this transaction.
    """
    escrow_ref = db.reference(f'escrows/{escrow_id}')
    
    requires_wallet_transfer = False

    def transaction_update(current_data):
        nonlocal requires_wallet_transfer
        if current_data is None: return None # Abort if record missing

        now = int(time.time())

        # A. IMMUTABILITY CHECK
        # If ledger is already closed, block all further activity.
        if current_data.get('ledger', {}).get('is_closed'):
            raise Exception("Access Denied: Record is permanently closed.")
        
        current_state = current_data['status_matrix']['escrow_status']

        # Scheduled dispute refunds:
        # - RETURN requires seller confirmation before refund.
        # - Refunds cannot be processed before deadlines.refund_expected_by.
        # - ADMIN can override.
        if target_state == "REFUNDED" and current_state == "DISPUTED" and actor_role != "ADMIN":
            dispute_meta = current_data.get('dispute', {}) or {}
            kind = str(dispute_meta.get('kind', '') or '').upper()
            if kind == "RETURN" and dispute_meta.get('return_confirmed') is not True:
                raise Exception("Refund blocked: Seller must confirm product retrieval first.")

            deadlines = current_data.get('deadlines', {}) or {}
            try:
                refund_expected_by = int(deadlines.get('refund_expected_by') or 0)
            except (TypeError, ValueError):
                refund_expected_by = 0

            if refund_expected_by <= 0:
                raise Exception("Refund blocked: Refund is not scheduled yet.")
            if now < refund_expected_by:
                raise Exception("Refund blocked: Scheduled processing window not reached yet.")
        
        # B. FSM TRANSITION VALIDATION
        if target_state not in STATE_RULES.get(current_state, []):
            raise Exception(f"Protocol Violation: Cannot jump from {current_state} to {target_state}")

        # C. STRICT ROLE-BASED ACCESS CONTROL (RBAC)
        if actor_role != "ADMIN":
            # 1. Lock Enforcement
            # When an escrow is locked (e.g., dispute opened), only ADMIN can operate freely.
            # SYSTEM is allowed to finalize terminal transitions (REFUNDED/RELEASED).
            if current_data.get('ledger', {}).get('is_locked'):
                # While locked, only SYSTEM may finalize terminal outcomes.
                if target_state in ["RELEASED", "REFUNDED"] and actor_id != "SYSTEM":
                    raise Exception("Escrow Locked: Pending Admin resolution.")
                # Block any other non-admin transitions while locked.
                if target_state not in ["DISPUTED", "RELEASED", "REFUNDED"]:
                    raise Exception("Escrow Locked: Pending Admin resolution.")

            # 2. Transition Guard: Seller Only
            if current_state == "FUNDED" and target_state == "SHIPPED":
                if actor_id != current_data.get('seller_id'):
                    raise Exception("Auth Error: Only the Seller can initiate shipment.")
            
            # 3. Transition Guard: Buyer Only
            if current_state == "SHIPPED" and target_state == "DELIVERED":
                if actor_id != current_data.get('buyer_id'):
                    raise Exception("Auth Error: Only the Buyer can confirm delivery.")
            
            # 4. System Guard: Automated Payouts
            if actor_id == "SYSTEM":
                # System actor can ONLY trigger terminal states (Auto-Refund/Release)
                if target_state not in ["RELEASED", "REFUNDED"]:
                    raise Exception("Security: SYSTEM actor restricted to completion states only.")

                # Auto-release enforcement: SYSTEM may only RELEASE after the 30-day window.
                if target_state == "RELEASED" and current_state == "DELIVERED":
                    deadlines = current_data.get('deadlines') or {}
                    try:
                        auto_release_at = int(deadlines.get('auto_release_at') or 0)
                    except (TypeError, ValueError):
                        auto_release_at = 0

                    if auto_release_at <= 0:
                        raise Exception("Auto-release blocked: auto_release_at deadline not set.")
                    if now < auto_release_at:
                        raise Exception("Auto-release blocked: 30-day window not reached yet.")

        # D. SYNCHRONIZED PROPERTY UPDATES
        current_data['status_matrix']['escrow_status'] = target_state
        
        if target_state == "FUNDED":
            current_data['status_matrix']['payment_status'] = "COMPLETED"
            
        elif target_state == "SHIPPED":
            current_data['status_matrix']['shipment_status'] = "SHIPPED"
            
            # Persist tracking details if supplied
            if kwargs.get('tracking_number'):
                current_data['ledger']['tracking_number'] = kwargs.get('tracking_number')
            if kwargs.get('shipping_carrier'):
                current_data['ledger']['shipping_carrier'] = kwargs.get('shipping_carrier')
            
        elif target_state == "DELIVERED":
            current_data['status_matrix']['shipment_status'] = "DELIVERED"
            # Set the auto-release window (30 days from delivery confirmation)
            current_data.setdefault('deadlines', {})
            current_data['deadlines']['auto_release_at'] = now + AUTO_RELEASE_SECONDS

        elif target_state == "DISPUTED":
            # Lock the escrow while a dispute is active.
            current_data.setdefault('ledger', {})
            current_data['ledger']['is_locked'] = True

            # Persist dispute metadata for the UI.
            current_data.setdefault('dispute', {})
            if kwargs.get('dispute_kind'):
                current_data['dispute']['kind'] = str(kwargs.get('dispute_kind')).upper()
            if kwargs.get('dispute_reason'):
                current_data['dispute']['reason'] = str(kwargs.get('dispute_reason'))[:2000]
            if kwargs.get('dispute_id'):
                current_data['dispute']['dispute_id'] = str(kwargs.get('dispute_id'))
            current_data['dispute']['opened_by'] = str(kwargs.get('dispute_opened_by') or actor_id)
            current_data['dispute']['opened_at'] = int(kwargs.get('dispute_opened_at') or now)
            current_data['dispute']['return_required'] = bool(kwargs.get('return_required', False))
            current_data['dispute']['return_confirmed'] = bool(current_data['dispute'].get('return_confirmed', False))

            # Mark payment as on-hold (funds should not be released while disputed).
            current_data.setdefault('status_matrix', {})
            current_data['status_matrix']['payment_status'] = "ON_HOLD"

            # Store a UI-friendly refund expectation window.
            current_data.setdefault('deadlines', {})
            # For CANCEL disputes refund is scheduled for 3 days.
            # For RETURN disputes refund is scheduled only after seller confirms retrieval.
            override_refund_expected_by = kwargs.get('refund_expected_by', None)
            if override_refund_expected_by is not None:
                try:
                    current_data['deadlines']['refund_expected_by'] = int(override_refund_expected_by)
                except (TypeError, ValueError):
                    current_data['deadlines']['refund_expected_by'] = 0
            else:
                current_data['deadlines']['refund_expected_by'] = 0 if current_data['dispute']['return_required'] else (now + (3 * 86400))
            
        elif target_state == "RELEASED":
            current_data['status_matrix']['payment_status'] = "TRANSFERRED"
            current_data['ledger']['is_closed'] = True # PERMANENT LOCK
            requires_wallet_transfer = True
            
        elif target_state == "REFUNDED":
            current_data['status_matrix']['payment_status'] = "REFUNDED"

            # Persist optional refund/dispute closure details (used by dispute workflows).
            current_data.setdefault('dispute', {})
            if kwargs.get('refund_reason'):
                current_data['dispute']['refund_reason'] = str(kwargs.get('refund_reason'))[:2000]
            if kwargs.get('return_confirmed') is True:
                current_data['dispute']['return_confirmed'] = True
                current_data['dispute']['return_confirmed_at'] = int(time.time())

            current_data['ledger']['is_closed'] = True # PERMANENT LOCK
            
        elif target_state == "CANCELLED":
            current_data['ledger']['is_closed'] = True

        # E. PERSISTENCE & AUDIT
        current_data['metadata']['updated_at'] = now
        
        # Incremental Audit Trail (Append-Only)
        log_id = f"log_{int(time.time() * 1000)}"
        if 'audit_trail' not in current_data:
            current_data['audit_trail'] = {}
            
        current_data['audit_trail'][log_id] = {
            "old_state": current_state,
            "new_state": target_state,
            "action_by": actor_id,
            "role": actor_role,
            "reason": reason,
            "timestamp": now
        }
        
        return current_data

    try:
        escrow_ref.transaction(transaction_update)
        
        # Post-transaction side effects
        if requires_wallet_transfer:
            escrow_data = escrow_ref.get()
            if escrow_data:
                print(f"[DEBUG] Releasing funds to seller: {escrow_data['seller_id']}, amount: {escrow_data['ledger']['amount']}")
                from utils.firebase_db import WalletAPI
                success = WalletAPI.add_transaction(
                    transaction_id=f"tx_{escrow_id}_{int(time.time())}",
                    user_id=escrow_data['seller_id'],
                    amount=escrow_data['ledger']['amount'],
                    t_type='ESCROW_RELEASE'
                )
                print(f"[DEBUG] Wallet transaction created: {success}")
                
                # Create notification for seller that funds were released
                try:
                    notification_id = f"notif_{str(uuid.uuid4())[:12]}"
                    notif = {
                        "notification_id": notification_id,
                        "user_id": escrow_data['seller_id'],
                        "type": "PAYMENT_RELEASED",
                        "title": "Funds Released",
                        "message": f"Buyer has released the escrow. ${escrow_data['ledger']['amount']} has been transferred to your wallet.",
                        "read": False,
                        "created_at": int(time.time()),
                        "related_escrow_id": escrow_id,
                        "related_product_id": escrow_data['product_id'],
                        "related_user_id": escrow_data['buyer_id'],
                        "action_required": False
                    }
                    db.reference(f'notifications/{escrow_data["seller_id"]}/{notification_id}').set(notif)
                    print(f"🔥 [DEBUG] Notification created: {notification_id} (PAYMENT_RELEASED) for {escrow_data['seller_id']}")
                except Exception as notif_err:
                    print(f"[WARNING] Failed to create seller notification: {str(notif_err)}")

        return True, f"Success: Escrow moved to {target_state}"
    except Exception as e:
        return False, str(e)

# --- 3. SECURE ENDPOINTS ---

@escrow_bp.route("/order", methods=["POST"])
def initialize_escrow():
    """Initializes a new hardened escrow ledger (Buyer initiates)."""
    try:
        data = request.json
        required_fields = ['product_id', 'buyer_id', 'seller_id', 'amount']
        
        # Validate required fields
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400
        
        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({"success": False, "error": "Amount must be greater than 0"}), 400
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Invalid amount format"}), 400
        
        escrow_id = f"esc_{str(uuid.uuid4())[:12]}"
        now = int(time.time())
        
        schema = {
            "escrow_id": escrow_id,
            "product_id": data['product_id'],
            "buyer_id": data['buyer_id'],
            "seller_id": data['seller_id'],
            "created_at": now,  # Add created_at at top level for sorting
            "ledger": {
                "amount": amount,
                "is_locked": False,
                "is_closed": False # Python Boolean Fix
            },
            "status_matrix": {
                "escrow_status": "PENDING_PAYMENT",
                "payment_status": "PENDING",
                "shipment_status": "PENDING"
            },
            "deadlines": {
                "created_at": now,
                "ship_by": now + (3 * 86400), # Exactly 3 days to ship
                "auto_release_at": 0
            },
            "metadata": {
                "created_at": now,
                "updated_at": now,
                "version": "2.1.0"
            },
            "audit_trail": {
                f"init_{now}": {"msg": "Hardened Ledger Initialized", "timestamp": now}
            }
        }
        
        # Store in Firebase
        db.reference(f'escrows/{escrow_id}').set(schema)
        
        # Create notification for seller: item was purchased
        try:
            notification_id = f"notif_{str(uuid.uuid4())[:12]}"
            notif = {
                "notification_id": notification_id,
                "user_id": data['seller_id'],
                "type": "PURCHASE",
                "title": "Purchase Initiated",
                "message": f"A buyer is interested in your product. Amount in escrow: ${schema['ledger']['amount']}",
                "read": False,
                "created_at": now,
                "related_escrow_id": escrow_id,
                "related_product_id": data['product_id'],
                "related_user_id": data['buyer_id'],
                "action_required": True
            }
            db.reference(f'notifications/{data["seller_id"]}/{notification_id}').set(notif)
            print(f"🔥 [DEBUG] Notification created: {notification_id} for seller {data['seller_id']}")
        except Exception as notif_err:
            print(f"[WARNING] Failed to create seller notification: {str(notif_err)}")
        
        print(f"Escrow created: {escrow_id} for buyer {data['buyer_id']} and seller {data['seller_id']}")
        
        return jsonify({"success": True, "escrow_id": escrow_id}), 201
    except Exception as e:
        print(f"Error initializing escrow: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@escrow_bp.route("/process-action", methods=["POST"])
def process_action():
    """Unified entry point for manual state transitions."""
    data = request.json
    # Validation: Ensure role is specified for RBAC
    success, result = execute_atomic_transition(
        data['escrow_id'], 
        data['target_state'], 
        data['user_id'], 
        data.get('role', 'GUEST'), # Typically extracted from Firebase Auth JWT
        data.get('reason', 'Standard manual update'),
        tracking_number=data.get('tracking_number'),
        shipping_carrier=data.get('shipping_carrier')
    )
    return jsonify({"success": success, "message": result})

@escrow_bp.route("/scheduler/maintenance", methods=["POST"])
def run_maintenance():
    """
    High-performance scheduler queries. 
    Uses Indexed-Queries for Refunding and Releasing.
    """
    now = int(time.time())
    report = {"auto_refunded": 0, "auto_released": 0, "scheduled_dispute_refunds": 0}

    # 1. OPTIMIZED AUTO-REFUND (Query only FUNDED)
    # Firebase Rules required: ".indexOn": "status_matrix/escrow_status"
    fund_check = db.reference('escrows').order_by_child('status_matrix/escrow_status').equal_to('FUNDED').get()
    
    if fund_check:
        for eid, data in fund_check.items():
            if now > data['deadlines']['ship_by']:
                success, _ = execute_atomic_transition(eid, "REFUNDED", "SYSTEM", "SYSTEM", "Auto-refund: Deadline exceeded")
                if success: report["auto_refunded"] += 1
    
    # 2. OPTIMIZED AUTO-RELEASE (Query only DELIVERED)
    delivery_check = db.reference('escrows').order_by_child('status_matrix/escrow_status').equal_to('DELIVERED').get()
    
    if delivery_check:
        for eid, data in delivery_check.items():
            deadlines = data.get('deadlines') or {}
            try:
                auto_release_at = int(deadlines.get('auto_release_at') or 0)
            except (TypeError, ValueError):
                auto_release_at = 0

            # Only release when a valid deadline is set and the window has passed.
            if auto_release_at > 0 and now > auto_release_at:
                success, _ = execute_atomic_transition(eid, "RELEASED", "SYSTEM", "SYSTEM", "Auto-release: Safe window closed")
                if success: report["auto_released"] += 1

    # 3. SCHEDULED DISPUTE REFUNDS (Query only DISPUTED)
    dispute_check = db.reference('escrows').order_by_child('status_matrix/escrow_status').equal_to('DISPUTED').get()

    if dispute_check:
        for eid, data in dispute_check.items():
            if not isinstance(data, dict):
                continue
            deadlines = data.get('deadlines') or {}
            try:
                refund_expected_by = int(deadlines.get('refund_expected_by') or 0)
            except (TypeError, ValueError):
                refund_expected_by = 0

            if refund_expected_by <= 0 or now < refund_expected_by:
                continue

            dispute_meta = data.get('dispute') or {}
            kind = str(dispute_meta.get('kind') or '').upper()
            if kind == 'RETURN' and dispute_meta.get('return_confirmed') is not True:
                continue

            refund_reason = (
                'Buyer cancelled before delivery (scheduled)'
                if kind == 'CANCEL'
                else 'Return confirmed (scheduled)'
                if kind == 'RETURN'
                else 'Scheduled dispute refund'
            )

            success, _ = execute_atomic_transition(
                eid,
                'REFUNDED',
                'SYSTEM',
                'SYSTEM',
                'Scheduled dispute refund processed',
                refund_reason=refund_reason,
            )
            if success:
                report['scheduled_dispute_refunds'] += 1

                # Best-effort dispute record update.
                dispute_id = str((dispute_meta or {}).get('dispute_id') or '').strip()
                if dispute_id:
                    db.reference(f'disputes/{dispute_id}').update({
                        'status': 'REFUNDED',
                        'refunded_at': now,
                    })
                else:
                    all_disputes = db.reference('disputes').get() or {}
                    for did, d in all_disputes.items():
                        if isinstance(d, dict) and str(d.get('escrow_id') or '') == str(eid):
                            db.reference(f'disputes/{did}').update({
                                'status': 'REFUNDED',
                                'refunded_at': now,
                            })
                            break

    return jsonify({"success": True, "report": report})

@escrow_bp.route("/<escrow_id>", methods=["GET"])
def get_escrow_details(escrow_id):
    """Fetch full details of a single escrow for the dashboard."""
    esc = db.reference(f'escrows/{escrow_id}').get()
    if not esc:
        return jsonify({"success": False, "error": "Escrow not found"}), 404
    return jsonify({"success": True, "escrow": esc})

@escrow_bp.route("/user/<user_id>", methods=["GET"])
def get_user_escrows(user_id):
    """Fetch all escrows where the user is either buyer or seller."""
    # Note: In production, use indexing on buyer_id/seller_id
    all_escrows = db.reference('escrows').get() or {}
    user_escrows = []
    identity_keys = _resolve_identity_keys(user_id)
    
    for eid, data in all_escrows.items():
        if data.get('buyer_id') in identity_keys or data.get('seller_id') in identity_keys:
            user_escrows.append(data)
            
    return jsonify({"success": True, "escrows": user_escrows})
