import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
	confirmPaymentIntent,
	createPaymentIntent,
	getEscrowDetails,
} from "../services/api";
import { formatPrice } from "../utils/formatPrice";

const isSettledEscrow = (escrow) => {
	const paymentStatus = String(
		escrow?.status_matrix?.payment_status || "",
	).toUpperCase();
	const escrowStatus = String(
		escrow?.status_matrix?.escrow_status || "",
	).toUpperCase();
	return (
		["PAID", "COMPLETED"].includes(paymentStatus) ||
		["FUNDED", "RELEASED"].includes(escrowStatus)
	);
};

const stripePublishableKey =
	import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
	"pk_test_51TMVkiJoolet4an5hU7JfgK2AJQ6djNuev38KV3XHWzySiU5PAQjcaNuiJeGcAVzWtoMLciLY4BOsjVRq2Q6H2OY00Dy6ghIuN";
const stripePromise = loadStripe(stripePublishableKey);

const CheckoutForm = ({ escrowId, amount, onSuccess, onBack }) => {
	const stripe = useStripe();
	const elements = useElements();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [isPaymentDetailsComplete, setIsPaymentDetailsComplete] =
		useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!stripe || !elements) {
			return;
		}

		if (!isPaymentDetailsComplete) {
			setError("Please complete payment details before continuing.");
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const result = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/escrow/${escrowId}`,
				},
				redirect: "if_required",
			});

			if (result.error) {
				const recoveredIntent = result.error.payment_intent;
				if (
					recoveredIntent &&
					["succeeded", "processing"].includes(
						String(recoveredIntent.status || "").toLowerCase(),
					)
				) {
					await onSuccess(recoveredIntent);
					return;
				}

				setError(result.error.message || "Stripe payment failed.");
				setSubmitting(false);
				return;
			}

			if (
				result.paymentIntent?.status === "succeeded" ||
				result.paymentIntent?.status === "processing"
			) {
				await onSuccess(result.paymentIntent);
				return;
			}

			setError("Stripe did not return a successful payment status.");
		} catch (err) {
			setError(err.message || "Payment confirmation failed.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div>
				<label className="mb-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
					Payment details
				</label>
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
					<PaymentElement
						options={{
							layout: "tabs",
						}}
						onChange={(event) => {
							setIsPaymentDetailsComplete(Boolean(event.complete));
							if (event.error?.message) {
								setError(event.error.message);
							} else {
								setError(null);
							}
						}}
					/>
				</div>
			</div>

			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
				<p className="text-sm text-blue-800 dark:text-blue-300">
					Stripe will confirm the payment and the escrow will only be marked
					paid after the webhook verifies the event.
				</p>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
					<p className="text-sm text-red-800 dark:text-red-300">{error}</p>
				</div>
			)}

			<div className="space-y-3">
				<button
					type="submit"
					disabled={
						!stripe || !elements || submitting || !isPaymentDetailsComplete
					}
					className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
				>
					{submitting
						? "Confirming with Stripe..."
						: `Pay ${formatPrice(amount)}`}
				</button>
				<button
					type="button"
					onClick={onBack}
					disabled={submitting}
					className="w-full rounded-lg bg-slate-200 px-4 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
				>
					Back to Review
				</button>
			</div>
		</form>
	);
};

const StripePaymentPage = () => {
	const { escrowId } = useParams();
	const navigate = useNavigate();
	const [escrow, setEscrow] = useState(null);
	const [loading, setLoading] = useState(true);
	const [pageError, setPageError] = useState(null);
	const [checkoutError, setCheckoutError] = useState(null);
	const [step, setStep] = useState(1);
	const [preparingIntent, setPreparingIntent] = useState(false);
	const [clientSecret, setClientSecret] = useState(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		fetchEscrowDetails();
	}, [escrowId]);

	const fetchEscrowDetails = async () => {
		try {
			setLoading(true);
			const res = await getEscrowDetails(escrowId);
			if (res.success) {
				setEscrow(res.escrow);
				if (isSettledEscrow(res.escrow)) {
					setSuccess(true);
					setStep(3);
				}
			} else {
				setPageError("Failed to load escrow details.");
			}
		} catch (err) {
			setPageError(err.message || "Failed to load escrow details.");
		} finally {
			setLoading(false);
		}
	};

	const prepareStripeCheckout = async () => {
		if (isSettledEscrow(escrow)) {
			setSuccess(true);
			setStep(3);
			setTimeout(() => {
				navigate(`/escrow/${escrowId}`);
			}, 1200);
			return;
		}

		if (clientSecret) {
			setStep(2);
			return;
		}

		setPreparingIntent(true);
		setCheckoutError(null);

		try {
			const res = await createPaymentIntent({ escrow_id: escrowId });
			if (!res.success) {
				setCheckoutError(res.error || "Unable to prepare Stripe checkout.");
				if (res.payment_status === "PAID" || res.alreadyPaid) {
					setSuccess(true);
					setStep(3);
					setTimeout(() => {
						navigate(`/escrow/${escrowId}`);
					}, 1200);
				}
				return;
			}

			if (res.alreadyPaid) {
				setSuccess(true);
				setStep(3);
				setTimeout(() => {
					navigate(`/escrow/${escrowId}`);
				}, 1800);
				return;
			}

			if (!res.clientSecret) {
				setCheckoutError("Stripe did not return a valid payment session.");
				return;
			}

			setClientSecret(res.clientSecret);
			setStep(2);
		} catch (err) {
			setCheckoutError(err.message || "Unable to prepare Stripe checkout.");
		} finally {
			setPreparingIntent(false);
		}
	};

	const handlePaymentSuccess = async (paymentIntent) => {
		if (!paymentIntent?.id) {
			setCheckoutError("Payment succeeded but payment intent id is missing.");
			return;
		}

		try {
			const confirmRes = await confirmPaymentIntent({
				escrow_id: escrowId,
				payment_intent_id: paymentIntent.id,
			});

			if (!confirmRes.success) {
				const latest = await getEscrowDetails(escrowId).catch(() => null);
				if (latest?.success && isSettledEscrow(latest.escrow)) {
					setSuccess(true);
					setStep(3);
					setEscrow(latest.escrow);
					setTimeout(() => {
						navigate(`/escrow/${escrowId}`);
					}, 1800);
					return;
				}

				setCheckoutError(
					confirmRes.error ||
						"Payment was captured but escrow sync failed. Please refresh.",
				);
				return;
			}
		} catch (err) {
			const latest = await getEscrowDetails(escrowId).catch(() => null);
			if (latest?.success && isSettledEscrow(latest.escrow)) {
				setSuccess(true);
				setStep(3);
				setEscrow(latest.escrow);
				setTimeout(() => {
					navigate(`/escrow/${escrowId}`);
				}, 1800);
				return;
			}

			setCheckoutError(
				err.message ||
					"Payment was captured but escrow sync failed. Please refresh.",
			);
			return;
		}

		setSuccess(true);
		setStep(3);

		try {
			const latest = await getEscrowDetails(escrowId);
			if (latest.success && latest.escrow) {
				setEscrow(latest.escrow);
			}
		} catch {
			// Navigation still continues even if the refresh fails.
		}

		setTimeout(() => {
			navigate(`/escrow/${escrowId}`);
		}, 2500);
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
				<div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
			</div>
		);
	}

	if (!escrow) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center dark:bg-slate-950">
				<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
					<svg
						className="h-8 w-8"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 className="mb-2 text-2xl font-bold text-slate-800 dark:text-white">
					Stripe checkout unavailable
				</h2>
				<p className="mb-6 max-w-sm text-slate-500">
					{pageError ||
						"The requested escrow could not be loaded or is no longer available."}
				</p>
				<button
					onClick={() => navigate("/browse")}
					className="w-full max-w-xs rounded-lg bg-slate-800 px-4 py-3 font-bold text-white transition-colors hover:bg-slate-900"
				>
					Return to Marketplace
				</button>
			</div>
		);
	}

	const totalAmount = escrow?.ledger?.amount ?? 0;
	const status = escrow?.status_matrix?.payment_status;

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8 dark:from-slate-950 dark:to-slate-900">
			<div className="mx-auto max-w-5xl px-4">
				<div className="mb-6">
					<button
						onClick={() => navigate(-1)}
						className="flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
					>
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back
					</button>
				</div>

				<div className="mb-8">
					<div className="mb-6 flex items-center justify-center">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
							💳
						</div>
						<h1 className="ml-3 text-3xl font-bold text-slate-900 dark:text-white">
							Stripe Checkout
						</h1>
					</div>
					<p className="text-center text-slate-600 dark:text-slate-400">
						{step === 1 && "Review your order details"}
						{step === 2 && "Enter your payment details with Stripe Elements"}
						{step === 3 &&
							(success
								? "Payment confirmed by Stripe"
								: "Processing your payment")}
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2">
						<div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900">
							{step === 1 && (
								<div className="p-8">
									<div className="mb-8">
										<h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
											Order Summary
										</h3>
										<div className="space-y-4">
											<div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
												<span className="text-slate-600 dark:text-slate-400">
													Order ID
												</span>
												<span className="rounded bg-slate-100 px-3 py-1 font-mono text-sm text-slate-900 dark:bg-slate-800 dark:text-white">
													{escrow.escrow_id}
												</span>
											</div>
											<div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
												<span className="text-slate-600 dark:text-slate-400">
													Product ID
												</span>
												<span className="font-semibold text-slate-900 dark:text-white">
													{escrow.product_id}
												</span>
											</div>
											<div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
												<span className="text-slate-600 dark:text-slate-400">
													Amount
												</span>
												<span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
													{formatPrice(totalAmount)}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-slate-600 dark:text-slate-400">
													Stripe Payment Status
												</span>
												<span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">
													{status || "PENDING"}
												</span>
											</div>
										</div>
									</div>

									<div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
										<p className="text-sm text-blue-800 dark:text-blue-300">
											<strong>Secure checkout:</strong> Stripe handles card
											entry and payment authorization. The escrow record will be
											marked paid only after a successful Stripe webhook.
										</p>
									</div>

									{pageError && (
										<div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
											<p className="text-sm text-red-800 dark:text-red-300">
												{pageError}
											</p>
										</div>
									)}

									{checkoutError && (
										<div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
											<p className="text-sm text-red-800 dark:text-red-300">
												{checkoutError}
											</p>
										</div>
									)}

									<button
										onClick={prepareStripeCheckout}
										disabled={preparingIntent || status === "PAID"}
										className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
									>
										{preparingIntent
											? "Preparing Stripe checkout..."
											: status === "PAID"
												? "Already Paid"
												: "Continue to Stripe Checkout"}
									</button>
								</div>
							)}

							{step === 2 && (
								<div className="p-8">
									<h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
										Payment Information
									</h3>

									{!clientSecret ? (
										<div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-slate-500 dark:border-slate-700 dark:bg-slate-950">
											<div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
										</div>
									) : (
										<Elements
											stripe={stripePromise}
											options={{
												clientSecret,
												appearance: {
													theme: "stripe",
												},
											}}
										>
											<CheckoutForm
												escrowId={escrowId}
												amount={totalAmount}
												onSuccess={handlePaymentSuccess}
												onBack={() => setStep(1)}
											/>
										</Elements>
									)}
								</div>
							)}

							{step === 3 && (
								<div className="p-8 text-center">
									<div className="mb-6 inline-block">
										<div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl dark:bg-green-500/20">
											✓
										</div>
									</div>
									<h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
										Payment Successful
									</h3>
									<p className="mb-2 text-slate-600 dark:text-slate-400">
										Stripe confirmed the payment for this escrow.
									</p>
									<p className="mb-6 text-sm text-slate-500 dark:text-slate-500">
										Amount paid:{" "}
										<span className="text-lg font-bold text-slate-900 dark:text-white">
											{formatPrice(totalAmount)}
										</span>
									</p>
									<p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
										Redirecting to transaction details...
									</p>
									<div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-700">
										<div
											className="h-1 rounded-full bg-green-500 animate-pulse"
											style={{ animation: "slide 3s ease-in-out forwards" }}
										/>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="lg:col-span-1">
						<div className="sticky top-6 rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
							<h4 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">
								Summary
							</h4>

							<div className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-700">
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Subtotal</span>
									<span>{formatPrice(totalAmount)}</span>
								</div>
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Stripe processing</span>
									<span>Included</span>
								</div>
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Tax</span>
									<span>$0.00</span>
								</div>
							</div>

							<div className="mt-6 flex items-center justify-between">
								<span className="text-lg font-bold text-slate-900 dark:text-white">
									Total
								</span>
								<span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
									{formatPrice(totalAmount)}
								</span>
							</div>

							<div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
								<div className="flex items-start gap-2">
									<span className="text-green-500 text-lg">✓</span>
									<span>Funds held in escrow</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-green-500 text-lg">✓</span>
									<span>Released upon delivery</span>
								</div>
								<div className="flex items-start gap-2">
									<span className="text-green-500 text-lg">✓</span>
									<span>Stripe webhook verified</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<style>{`\n\t\t\t\t@keyframes slide {\n\t\t\t\t\tfrom {\n\t\t\t\t\t\twidth: 0%;\n\t\t\t\t\t}\n\t\t\t\t\tto {\n\t\t\t\t\t\twidth: 100%;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t`}</style>
		</div>
	);
};

export default StripePaymentPage;
