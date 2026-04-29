from flask import Blueprint, request, jsonify
from firebase_admin import db
from utils.firebase_db import WalletAPI
from utils.auth_helper import token_required
import uuid
import re
import time
import random

wallet_bp = Blueprint("wallet", __name__, url_prefix="/api/wallet")


CASHOUT_PROCESSING_SECONDS = 3 * 24 * 60 * 60


def _resolve_identity_keys(user_id: str):
    """Resolve uid/username aliases for a user identifier."""
    users = db.reference('users').get() or {}
    identity_keys = {user_id}
    for uid, user_data in users.items():
        if not isinstance(user_data, dict):
            continue
        username = user_data.get('username')

        if uid == user_id and username:
            identity_keys.add(username)
        if username == user_id:
            identity_keys.add(uid)
    return identity_keys


def _compute_earnings(user_id: str):
    """Compute cashout summary from released escrows and withdrawal transactions."""
    identity_keys = _resolve_identity_keys(user_id)

    escrows = db.reference('escrows').get() or {}
    total_earned = 0.0
    for _, escrow in escrows.items():
        if not isinstance(escrow, dict):
            continue

        is_seller = escrow.get('seller_id') in identity_keys
        is_released = escrow.get('status_matrix', {}).get('escrow_status') == 'RELEASED'
        if is_seller and is_released:
            amount = escrow.get('ledger', {}).get('amount', 0)
            try:
                total_earned += float(amount or 0)
            except (TypeError, ValueError):
                pass

    transactions = db.reference('wallet_transactions').get() or {}
    total_cashed_out = 0.0
    for _, tx in transactions.items():
        if not isinstance(tx, dict):
            continue
        if tx.get('user_id') not in identity_keys:
            continue

        tx_type = tx.get('type', '')
        try:
            amount = float(tx.get('amount', 0) or 0)
        except (TypeError, ValueError):
            amount = 0.0

        if tx_type == 'WITHDRAWAL' and amount < 0:
            total_cashed_out += abs(amount)
        elif tx_type in ['CASHOUT', 'WITHDRAWAL'] and amount > 0:
            total_cashed_out += amount

    current_balance = max(total_earned - total_cashed_out, 0.0)
    return {
        "current_balance": round(current_balance, 2),
        "total_earned": round(total_earned, 2),
        "total_cashed_out": round(total_cashed_out, 2),
    }

@wallet_bp.route("/<user_id>", methods=["GET"])
def get_balance(user_id):
    """Get the wallet balance for a user."""
    wallet = WalletAPI.get_balance(user_id)
    return jsonify({"success": True, "wallet": wallet})

@wallet_bp.route("/earnings/<user_id>", methods=["GET"])
def get_earnings(user_id):
    """Get earnings statistics for a user."""
    try:
        earnings = _compute_earnings(user_id)
        
        return jsonify({
            "success": True,
            "earnings": earnings
        })
    except Exception as e:
        print(f"[ERROR] Getting earnings for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Failed to fetch earnings data"}), 500


@wallet_bp.route("/cashout/send-otp", methods=["POST"])
@token_required
def send_cashout_otp(current_user):
    """Send OTP for cashout mobile verification (simulated SMS in dev)."""
    try:
        data = request.json or {}
        user_id = data.get("user_id")
        mobile = str(data.get("mobile", "")).strip()

        if user_id != current_user.get("uid"):
            return jsonify({"success": False, "error": "Unauthorized user."}), 403

        if not re.match(r"^[6-9]\d{9}$", mobile):
            return jsonify({"success": False, "error": "Enter a valid 10-digit mobile number."}), 400

        profile_phone = str(current_user.get("phone", "")).strip()
        if profile_phone and profile_phone[-10:] != mobile[-10:]:
            return jsonify({
                "success": False,
                "error": "Mobile does not match the seller profile phone number."
            }), 400

        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = int(time.time()) + 300
        otp_ref = db.reference(f"cashout_verifications/{user_id}")
        otp_ref.set({
            "mobile": mobile,
            "otp": otp_code,
            "verified": False,
            "expires_at": expires_at,
            "attempts": 0,
            "updated_at": int(time.time()),
        })

        # NOTE: integrate SMS provider here in production.
        return jsonify({
            "success": True,
            "message": "OTP sent to registered mobile number.",
            "dev_otp": otp_code,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@wallet_bp.route("/cashout/verify-otp", methods=["POST"])
@token_required
def verify_cashout_otp(current_user):
    """Verify OTP for cashout mobile verification."""
    try:
        data = request.json or {}
        user_id = data.get("user_id")
        otp = str(data.get("otp", "")).strip()

        if user_id != current_user.get("uid"):
            return jsonify({"success": False, "error": "Unauthorized user."}), 403

        verification = db.reference(f"cashout_verifications/{user_id}").get()
        if not verification:
            return jsonify({"success": False, "error": "OTP session not found. Please request OTP again."}), 400

        if int(time.time()) > int(verification.get("expires_at", 0)):
            return jsonify({"success": False, "error": "OTP expired. Please request a new OTP."}), 400

        attempts = int(verification.get("attempts", 0)) + 1
        db.reference(f"cashout_verifications/{user_id}/attempts").set(attempts)
        if attempts > 5:
            return jsonify({"success": False, "error": "Too many attempts. Request OTP again."}), 429

        if otp != str(verification.get("otp", "")):
            return jsonify({"success": False, "error": "Invalid OTP."}), 400

        db.reference(f"cashout_verifications/{user_id}/verified").set(True)
        db.reference(f"cashout_verifications/{user_id}/verified_at").set(int(time.time()))
        return jsonify({"success": True, "message": "Mobile verified successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@wallet_bp.route("/cashout/request", methods=["POST"])
@token_required
def request_cashout(current_user):
    """Create a payout request after seller verification and deduct available balance."""
    try:
        data = request.json or {}
        user_id = data.get("user_id")
        amount = float(data.get("amount", 0))
        method = data.get("method", "").upper().strip()  # BANK or UPI
        mobile = str(data.get("mobile", current_user.get("phone", "") or "")).strip()
        account_holder_name = str(data.get("account_holder_name", "")).strip()
        upi_id = str(data.get("upi_id", "")).strip()
        bank_account_number = str(data.get("bank_account_number", "")).strip()
        ifsc_code = str(data.get("ifsc_code", "")).strip().upper()

        if user_id != current_user.get("uid"):
            return jsonify({"success": False, "error": "Unauthorized user."}), 403

        if amount <= 0:
            return jsonify({"success": False, "error": "Cashout amount must be greater than zero."}), 400

        if method not in ["BANK", "UPI"]:
            return jsonify({"success": False, "error": "Invalid payout method."}), 400

        # Basic ownership checks: profile name + phone must align with payout request.
        profile_name = str(current_user.get("full_name", current_user.get("username", ""))).strip().lower()
        req_name = account_holder_name.lower()
        if profile_name and req_name and profile_name not in req_name and req_name not in profile_name:
            return jsonify({
                "success": False,
                "error": "Account holder name must match seller profile name for payout verification."
            }), 400

        profile_phone = str(current_user.get("phone", "")).strip()
        if mobile and profile_phone and profile_phone[-10:] != mobile[-10:]:
            return jsonify({"success": False, "error": "Mobile does not match seller profile."}), 400

        if method == "UPI":
            if not re.match(r"^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$", upi_id):
                return jsonify({"success": False, "error": "Invalid UPI ID format."}), 400
        else:
            if not re.match(r"^\d{9,18}$", bank_account_number):
                return jsonify({"success": False, "error": "Invalid bank account number."}), 400
            if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc_code):
                return jsonify({"success": False, "error": "Invalid IFSC code."}), 400

        earnings = _compute_earnings(user_id)
        available = float(earnings.get("current_balance", 0))
        if amount > available:
            return jsonify({"success": False, "error": "Cashout amount exceeds available balance."}), 400

        payout_id = f"payout_{uuid.uuid4().hex[:12]}"
        now = int(time.time())
        settlement_expected_by = now + CASHOUT_PROCESSING_SECONDS
        payout_data = {
            "payout_id": payout_id,
            "user_id": user_id,
            "amount": amount,
            "method": method,
            "provider": "STRIPE_SIMULATED",
            "provider_reference": f"sim_stripe_{uuid.uuid4().hex[:10]}",
            "mobile": mobile,
            "account_holder_name": account_holder_name,
            "upi_id": upi_id if method == "UPI" else None,
            "bank_account_number_masked": f"****{bank_account_number[-4:]}" if method == "BANK" else None,
            "ifsc_code": ifsc_code if method == "BANK" else None,
            "verification_status": "SOFT_VERIFIED",
            "transfer_status": "SCHEDULED",
            "settlement_expected_by": settlement_expected_by,
            "created_at": now,
            "updated_at": now,
        }

        # Record payout request
        db.reference(f"payout_requests/{payout_id}").set(payout_data)

        # Deduct wallet via transaction ledger.
        tx_id = f"tx_cashout_{uuid.uuid4().hex[:10]}"
        if not WalletAPI.add_transaction(tx_id, user_id, -amount, "WITHDRAWAL"):
            return jsonify({"success": False, "error": "Failed to record wallet deduction."}), 500

        # Create notification.
        notif_id = f"notif_{uuid.uuid4().hex[:12]}"
        for recipient in _resolve_identity_keys(user_id):
            db.reference(f"notifications/{recipient}/{notif_id}").set({
                "notification_id": notif_id,
                "user_id": recipient,
                "type": "CASHOUT_SCHEDULED",
                "title": "Cashout Scheduled",
                "message": f"Your cashout request of INR {amount:.2f} is scheduled. Money will be sent within 3 days.",
                "read": False,
                "created_at": now,
                "action_required": False,
                "related_payout_id": payout_id,
                "settlement_expected_by": settlement_expected_by,
            })

        return jsonify({
            "success": True,
            "message": "Cashout scheduled successfully. Money will be sent within 3 days.",
            "payout_id": payout_id,
            "amount": amount,
            "transfer_status": "SCHEDULED",
            "settlement_expected_by": settlement_expected_by,
        })
    except ValueError:
        return jsonify({"success": False, "error": "Invalid amount format."}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@wallet_bp.route("/transaction", methods=["POST"])
def add_transaction():
    """Add a deposit or withdrawal transaction to the wallet."""
    data = request.json
    user_id = data.get('user_id')
    amount = float(data.get('amount', 0))
    t_type = data.get('type', 'DEPOSIT')  # DEPOSIT, WITHDRAWAL, ESCROW_RELEASE
    
    if not user_id or amount <= 0:
        return jsonify({"success": False, "error": "Invalid user_id or amount"}), 400
        
    transaction_id = f"tx_{uuid.uuid4().hex[:12]}"
    # Deduct if withdrawal
    final_amount = -amount if t_type == 'WITHDRAWAL' else amount
    
    success = WalletAPI.add_transaction(transaction_id, user_id, final_amount, t_type)
    if success:
        wallet = WalletAPI.get_balance(user_id)
        return jsonify({
            "success": True, 
            "transaction_id": transaction_id, 
            "new_balance": wallet.get('balance')
        })
    return jsonify({"success": False, "error": "Transaction failed"}), 500


@wallet_bp.route("/scheduler/settle-cashouts", methods=["POST"])
def settle_scheduled_cashouts():
    """Mark scheduled cashouts as sent after 3 days (simulated)."""
    try:
        now = int(time.time())
        report = {"settled": 0}

        payouts = db.reference('payout_requests').get() or {}
        for payout_id, payout in payouts.items():
            if not isinstance(payout, dict):
                continue

            status = str(payout.get('transfer_status') or '').upper()
            if status not in {'SCHEDULED', 'INITIATED', 'PROCESSING'}:
                continue

            try:
                expected_by = int(payout.get('settlement_expected_by') or 0)
            except (TypeError, ValueError):
                expected_by = 0

            if expected_by <= 0 or now < expected_by:
                continue

            user_id = str(payout.get('user_id') or '').strip()
            amount = payout.get('amount', 0)

            db.reference(f"payout_requests/{payout_id}").update({
                "transfer_status": "SENT",
                "sent_at": now,
                "updated_at": now,
            })

            if user_id:
                notif_id = f"notif_{uuid.uuid4().hex[:12]}"
                for recipient in _resolve_identity_keys(user_id):
                    db.reference(f"notifications/{recipient}/{notif_id}").set({
                        "notification_id": notif_id,
                        "user_id": recipient,
                        "type": "CASHOUT_SENT",
                        "title": "Cashout Sent",
                        "message": f"Your cashout of INR {float(amount or 0):.2f} has been sent (simulated).",
                        "read": False,
                        "created_at": now,
                        "action_required": False,
                        "related_payout_id": payout_id,
                    })

            report["settled"] += 1

        return jsonify({"success": True, "report": report})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
