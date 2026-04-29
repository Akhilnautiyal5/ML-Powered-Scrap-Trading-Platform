"""
Stripe payment routes for escrow checkout.
Creates PaymentIntents, verifies Stripe webhooks, and marks escrows as paid.
"""

from flask import Blueprint, request, jsonify
from firebase_admin import db
import os
import time
import uuid

import stripe

from utils.auth_helper import token_required

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")


def _safe_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _resolve_amount(escrow):
    ledger = escrow.get("ledger") or {}
    amount = escrow.get("total_price", ledger.get("amount", 0))
    return round(_safe_float(amount), 2)


def _resolve_currency(escrow):
    ledger = escrow.get("ledger") or {}
    currency = escrow.get("currency") or ledger.get("currency") or "usd"
    return str(currency).strip().lower() or "usd"


def _get_stripe_secret_key():
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise ValueError("STRIPE_SECRET_KEY is not configured.")
    return key


def _get_webhook_secret():
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not configured.")
    return secret


def _create_notification(user_id, notification_type, title, message, related_escrow_id=None,
                         related_product_id=None, related_user_id=None):
    try:
        recipients = _resolve_identity_keys(user_id)
        notification_id = f"notif_{str(uuid.uuid4())[:12]}"
        now = int(time.time())

        for recipient in recipients:
            notification = {
                "notification_id": notification_id,
                "user_id": recipient,
                "type": notification_type,
                "title": title,
                "message": message,
                "read": False,
                "created_at": now,
                "related_escrow_id": related_escrow_id,
                "related_product_id": related_product_id,
                "related_user_id": related_user_id,
                "action_required": notification_type in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_INITIATED"],
            }
            db.reference(f"notifications/{recipient}/{notification_id}").set(notification)
        return notification_id
    except Exception as exc:
        print(f"[WARN] Failed to create notification: {exc}")
        return None


def _resolve_identity_keys(user_id):
    """Resolve uid/username aliases for robust notification delivery and auth checks."""
    identity_keys = {str(user_id)}
    users = db.reference("users").get() or {}
    for uid, user_data in users.items():
        if not isinstance(user_data, dict):
            continue
        username = str(user_data.get("username", "")).strip()
        uid_str = str(uid)

        if uid_str == str(user_id) and username:
            identity_keys.add(username)
        if username and username == str(user_id):
            identity_keys.add(uid_str)
    return identity_keys


def _send_payment_initiated_notification(escrow_id, escrow, payment_intent_id):
    """Notify seller that buyer has started the Stripe payment flow."""
    payment_ref = db.reference(f"payments/{payment_intent_id}")
    payment_data = payment_ref.get() or {}
    if payment_data.get("initiated_notification_sent"):
        return

    amount = _resolve_amount(escrow)
    _create_notification(
        user_id=escrow.get("seller_id"),
        notification_type="PAYMENT_INITIATED",
        title="Payment Initiated",
        message=f"Buyer started payment of ${amount:.2f} for escrow {escrow_id}.",
        related_escrow_id=escrow_id,
        related_product_id=escrow.get("product_id"),
        related_user_id=escrow.get("buyer_id"),
    )
    payment_ref.update({
        "initiated_notification_sent": True,
        "updated_at": int(time.time()),
    })


def _settle_successful_payment(escrow_id, payment_intent, source):
    """Mark escrow as paid/funded and send seller notification exactly once."""
    try:
        escrow_ref = db.reference(f"escrows/{escrow_id}")
        escrow = escrow_ref.get()
        if not escrow:
            return False, "Escrow not found."

        payment_ref = db.reference(f"payments/{payment_intent.id}")
        existing_payment = payment_ref.get() or {}

        if (
            existing_payment.get("status") == "SUCCEEDED"
            and escrow.get("status_matrix", {}).get("payment_status") == "PAID"
        ):
            return True, None

        now = int(time.time())
        amount = round(_safe_float(payment_intent.amount_received or payment_intent.amount) / 100, 2)
        previous_state = escrow.get("status_matrix", {}).get("escrow_status", "PENDING_PAYMENT")

        def update_escrow(current):
            if current is None:
                return None

            current.setdefault("status_matrix", {})
            current.setdefault("ledger", {})
            current.setdefault("metadata", {})
            current.setdefault("audit_trail", {})

            current["status_matrix"]["escrow_status"] = "FUNDED"
            current["status_matrix"]["payment_status"] = "PAID"
            current["ledger"]["is_locked"] = False
            current["payment_intent_id"] = payment_intent.id
            current["payment_provider"] = "stripe"
            current["metadata"]["updated_at"] = now
            current["metadata"]["paid_at"] = now

            log_id = f"log_{int(time.time() * 1000)}"
            current["audit_trail"][log_id] = {
                "old_state": previous_state,
                "new_state": "FUNDED",
                "action_by": source,
                "role": "SYSTEM",
                "reason": "Stripe payment confirmed",
                "timestamp": now,
            }
            return current

        escrow_ref.transaction(update_escrow)

        payment_ref.set({
            "payment_intent_id": payment_intent.id,
            "escrow_id": escrow_id,
            "buyer_id": escrow.get("buyer_id"),
            "seller_id": escrow.get("seller_id"),
            "product_id": escrow.get("product_id"),
            "amount": amount,
            "currency": payment_intent.currency,
            "status": "SUCCEEDED",
            "method": "stripe",
            "created_at": existing_payment.get("created_at", now),
            "updated_at": now,
            "stripe_status": payment_intent.status,
            "stripe_charge_id": payment_intent.latest_charge,
            "paid_at": now,
            "notification_sent": bool(existing_payment.get("notification_sent", False)),
            "initiated_notification_sent": bool(existing_payment.get("initiated_notification_sent", False)),
        })

        if not existing_payment.get("notification_sent"):
            _create_notification(
                user_id=escrow.get("seller_id"),
                notification_type="PAYMENT_RECEIVED",
                title="Payment Successful",
                message=f"Payment of ${amount:.2f} for this item is successful and has been moved into escrow.",
                related_escrow_id=escrow_id,
                related_product_id=escrow.get("product_id"),
                related_user_id=escrow.get("buyer_id"),
            )
            payment_ref.update({"notification_sent": True})

        return True, None
    except Exception as exc:
        print(f"[ERROR] Failed to settle successful payment: {exc}")
        return False, str(exc)


@payment_bp.route("/create-payment-intent", methods=["POST"])
@token_required
def create_payment_intent(current_user):
    """Create a Stripe PaymentIntent from the escrow total."""
    try:
        data = request.get_json(silent=True) or {}
        escrow_id = str(data.get("escrow_id", "")).strip()

        if not escrow_id:
            return jsonify({"success": False, "error": "escrow_id is required."}), 400

        escrow_ref = db.reference(f"escrows/{escrow_id}")
        escrow = escrow_ref.get()
        if not escrow:
            return jsonify({"success": False, "error": "Escrow not found."}), 404

        buyer_id = str(escrow.get("buyer_id", ""))
        if buyer_id not in _resolve_identity_keys(current_user.get("uid")):
            return jsonify({"success": False, "error": "Unauthorized user."}), 403

        payment_status = str(escrow.get("status_matrix", {}).get("payment_status", "")).upper()
        if payment_status == "PAID":
            return jsonify({
                "success": True,
                "alreadyPaid": True,
                "message": "This escrow has already been paid.",
                "payment_status": payment_status,
                "escrow_status": str(escrow.get("status_matrix", {}).get("escrow_status", "FUNDED")),
            }), 200

        amount = _resolve_amount(escrow)
        if amount <= 0:
            return jsonify({"success": False, "error": "Invalid escrow amount."}), 400

        currency = _resolve_currency(escrow)
        stripe.api_key = _get_stripe_secret_key()

        existing_intent_id = escrow.get("payment_intent_id")
        if existing_intent_id:
            try:
                existing_intent = stripe.PaymentIntent.retrieve(existing_intent_id)
                if existing_intent and existing_intent.status in {
                    "requires_payment_method",
                    "requires_confirmation",
                    "requires_action",
                }:
                    return jsonify({
                        "success": True,
                        "clientSecret": existing_intent.client_secret,
                        "paymentIntentId": existing_intent.id,
                        "amount": amount,
                        "currency": currency,
                        "reused": True,
                    })
                if existing_intent and existing_intent.status in {"succeeded", "processing"}:
                    _settle_successful_payment(escrow_id, existing_intent, "STRIPE_REUSE")
                    return jsonify({
                        "success": True,
                        "clientSecret": existing_intent.client_secret,
                        "paymentIntentId": existing_intent.id,
                        "amount": amount,
                        "currency": currency,
                        "alreadyPaid": True,
                    })
            except stripe.error.StripeError:
                pass

        payment_intent = stripe.PaymentIntent.create(
            amount=int(round(amount * 100)),
            currency=currency,
            automatic_payment_methods={"enabled": True},
            metadata={
                "escrow_id": escrow_id,
                "buyer_id": str(escrow.get("buyer_id", "")),
                "seller_id": str(escrow.get("seller_id", "")),
                "product_id": str(escrow.get("product_id", "")),
            },
            description=f"Escrow payment for {escrow_id}",
        )

        now = int(time.time())
        payment_record = {
            "payment_intent_id": payment_intent.id,
            "escrow_id": escrow_id,
            "buyer_id": escrow.get("buyer_id"),
            "seller_id": escrow.get("seller_id"),
            "product_id": escrow.get("product_id"),
            "amount": amount,
            "currency": currency,
            "status": payment_intent.status,
            "client_secret": payment_intent.client_secret,
            "method": "stripe",
            "created_at": now,
            "updated_at": now,
            "notification_sent": False,
            "initiated_notification_sent": False,
        }
        db.reference(f"payments/{payment_intent.id}").set(payment_record)
        escrow_ref.update({
            "payment_intent_id": payment_intent.id,
            "payment_provider": "stripe",
            "metadata/updated_at": now,
        })

        return jsonify({
            "success": True,
            "clientSecret": payment_intent.client_secret,
            "paymentIntentId": payment_intent.id,
            "amount": amount,
            "currency": currency,
        })
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except stripe.error.StripeError as exc:
        return jsonify({"success": False, "error": exc.user_message or str(exc)}), 500
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@payment_bp.route("/confirm-payment-intent", methods=["POST"])
@token_required
def confirm_payment_intent(current_user):
    """Finalize escrow state immediately after frontend Stripe confirmation."""
    try:
        data = request.get_json(silent=True) or {}
        payment_intent_id = str(data.get("payment_intent_id", "")).strip()
        escrow_id_override = str(data.get("escrow_id", "")).strip()

        if not payment_intent_id:
            return jsonify({"success": False, "error": "payment_intent_id is required."}), 400

        escrow_id = escrow_id_override
        escrow = db.reference(f"escrows/{escrow_id}").get() if escrow_id else None

        if not escrow_id and payment_intent_id:
            existing_payment = db.reference(f"payments/{payment_intent_id}").get() or {}
            escrow_id = str(existing_payment.get("escrow_id", "")).strip()
            if escrow_id:
                escrow = db.reference(f"escrows/{escrow_id}").get()

        if not escrow_id:
            return jsonify({"success": False, "error": "Unable to resolve escrow_id."}), 400

        if not escrow:
            return jsonify({"success": False, "error": "Escrow not found."}), 404

        buyer_id = str(escrow.get("buyer_id", ""))
        if buyer_id not in _resolve_identity_keys(current_user.get("uid")):
            return jsonify({"success": False, "error": "Unauthorized user."}), 403

        current_payment_status = str(escrow.get("status_matrix", {}).get("payment_status", "")).upper()
        if current_payment_status == "PAID":
            return jsonify({
                "success": True,
                "escrow_id": escrow_id,
                "payment_intent_id": payment_intent_id,
                "payment_status": "PAID",
                "escrow_status": "FUNDED",
                "alreadyPaid": True,
            })

        stripe.api_key = _get_stripe_secret_key()
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as stripe_exc:
            latest_escrow = db.reference(f"escrows/{escrow_id}").get() or {}
            latest_payment_status = str(
                latest_escrow.get("status_matrix", {}).get("payment_status", "")
            ).upper()
            if latest_payment_status == "PAID":
                return jsonify({
                    "success": True,
                    "escrow_id": escrow_id,
                    "payment_intent_id": payment_intent_id,
                    "payment_status": "PAID",
                    "escrow_status": str(latest_escrow.get("status_matrix", {}).get("escrow_status", "FUNDED")),
                    "alreadyPaid": True,
                })
            return jsonify({
                "success": False,
                "error": stripe_exc.user_message or str(stripe_exc),
            }), 409

        status = str(payment_intent.status or "").lower()

        metadata = getattr(payment_intent, "metadata", None)
        if metadata is None:
            try:
                metadata = payment_intent["metadata"]
            except Exception:
                metadata = {}
        try:
            metadata = dict(metadata or {})
        except Exception:
            metadata = {}

        metadata_escrow_id = str(metadata.get("escrow_id", "")).strip()
        if metadata_escrow_id and metadata_escrow_id != escrow_id:
            return jsonify({"success": False, "error": "Escrow mismatch for payment intent."}), 409

        if status not in {"succeeded", "processing"}:
            return jsonify({
                "success": False,
                "error": f"Payment intent is not successful yet (status: {payment_intent.status}).",
            }), 409

        settled, err = _settle_successful_payment(escrow_id, payment_intent, "CLIENT_CONFIRM")
        if not settled:
            latest_escrow = db.reference(f"escrows/{escrow_id}").get() or {}
            latest_payment_status = str(
                latest_escrow.get("status_matrix", {}).get("payment_status", "")
            ).upper()
            if latest_payment_status == "PAID":
                return jsonify({
                    "success": True,
                    "escrow_id": escrow_id,
                    "payment_intent_id": payment_intent.id,
                    "payment_status": "PAID",
                    "escrow_status": str(latest_escrow.get("status_matrix", {}).get("escrow_status", "FUNDED")),
                    "alreadyPaid": True,
                })
            return jsonify({"success": False, "error": err or "Failed to settle payment."}), 500

        return jsonify({
            "success": True,
            "escrow_id": escrow_id,
            "payment_intent_id": payment_intent.id,
            "payment_status": "PAID",
            "escrow_status": "FUNDED",
        })
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except stripe.error.StripeError as exc:
        return jsonify({"success": False, "error": exc.user_message or str(exc)}), 500
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@payment_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    """Verify Stripe events and mark escrows as paid."""
    try:
        stripe.api_key = _get_stripe_secret_key()
        payload = request.data
        sig_header = request.headers.get("Stripe-Signature")
        event = stripe.Webhook.construct_event(payload, sig_header, _get_webhook_secret())

        if event.get("type") != "payment_intent.succeeded":
            return jsonify({"received": True}), 200

        payment_intent = event["data"]["object"]

        metadata = getattr(payment_intent, "metadata", None)
        if metadata is None:
            try:
                metadata = payment_intent["metadata"]
            except Exception:
                metadata = {}
        try:
            metadata = dict(metadata or {})
        except Exception:
            metadata = {}

        escrow_id = metadata.get("escrow_id")
        if not escrow_id:
            existing = db.reference(f"payments/{payment_intent.id}").get() or {}
            escrow_id = existing.get("escrow_id")
        if not escrow_id:
            return jsonify({"received": True}), 200

        settled, _ = _settle_successful_payment(escrow_id, payment_intent, "STRIPE_WEBHOOK")
        if not settled:
            return jsonify({"received": False}), 500

        return jsonify({"received": True}), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({"error": "Invalid Stripe signature."}), 400
    except Exception as exc:
        print(f"[ERROR] Stripe webhook failed: {exc}")
        return jsonify({"error": str(exc)}), 500


@payment_bp.route("/payment-status/<payment_intent_id>", methods=["GET"])
def get_payment_status(payment_intent_id):
    """Get payment details for a Stripe PaymentIntent."""
    try:
        payment = db.reference(f"payments/{payment_intent_id}").get()
        if not payment:
            return jsonify({"success": False, "error": "Payment not found"}), 404
        return jsonify({"success": True, "payment": payment}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@payment_bp.route("/escrow/<escrow_id>/payment", methods=["GET"])
def get_escrow_payment(escrow_id):
    """Get payment details for a given escrow."""
    try:
        escrow = db.reference(f"escrows/{escrow_id}").get()
        if not escrow:
            return jsonify({"success": False, "error": "Escrow not found"}), 404

        payment_intent_id = escrow.get("payment_intent_id")
        if not payment_intent_id:
            return jsonify({"success": False, "error": "No payment found for this escrow"}), 404

        payment = db.reference(f"payments/{payment_intent_id}").get()
        if not payment:
            return jsonify({"success": False, "error": "Payment not found"}), 404

        return jsonify({"success": True, "payment": payment}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@payment_bp.route("/wallet/<user_id>", methods=["GET"])
def get_wallet(user_id):
    """Get user's virtual wallet balance for existing wallet features."""
    try:
        wallet = db.reference(f"wallets/{user_id}").get()

        if not wallet:
            wallet = {
                "user_id": user_id,
                "balance": 10000.00,
                "currency": "USD",
                "created_at": int(time.time()),
                "updated_at": int(time.time()),
                "transactions": {},
            }
            db.reference(f"wallets/{user_id}").set(wallet)

        return jsonify({"success": True, "wallet": wallet}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
