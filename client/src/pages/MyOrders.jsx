import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserEscrows, getProduct } from "../services/api";
import { formatPrice } from "../utils/formatPrice";
import { getImageUrl } from "../utils/imageUtils";

const toTimestampMs = (value) => {
	if (value === null || value === undefined || value === "") return null;

	if (typeof value === "number") {
		if (!Number.isFinite(value) || value <= 0) return null;
		return value < 1e12 ? value * 1000 : value;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;

		const numeric = Number(trimmed);
		if (Number.isFinite(numeric) && numeric > 0) {
			return numeric < 1e12 ? numeric * 1000 : numeric;
		}

		const parsed = Date.parse(trimmed);
		return Number.isNaN(parsed) ? null : parsed;
	}

	if (typeof value === "object") {
		if (typeof value.seconds === "number") {
			return value.seconds * 1000;
		}
		if (typeof value._seconds === "number") {
			return value._seconds * 1000;
		}
	}

	return null;
};

const getOrderTimestampMs = (order) => {
	return (
		toTimestampMs(order?.metadata?.created_at) ??
		toTimestampMs(order?.created_at) ??
		toTimestampMs(order?.metadata?.updated_at) ??
		toTimestampMs(order?.updated_at)
	);
};

const MyOrders = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (user) {
			fetchOrders();
		}
	}, [user]);

	const fetchOrders = async () => {
		try {
			setLoading(true);
			setError(null);
			console.log("Fetching orders for user:", user.uid);

			const res = await getUserEscrows(user.uid);
			console.log("getUserEscrows response:", res);

			if (res.success && res.escrows) {
				// Filter to only buyer orders and enrich with product data
				const buyerOrders = res.escrows.filter(
					(order) => order.buyer_id === user.uid,
				);

				console.log("Buyer orders:", buyerOrders);

				// Fetch product details for each order
				const enrichedOrders = await Promise.all(
					buyerOrders.map(async (order) => {
						try {
							const productRes = await getProduct(order.product_id);
							return {
								...order,
								product: productRes.success ? productRes.product : null,
							};
						} catch (err) {
							console.error(`Error fetching product ${order.product_id}:`, err);
							return { ...order, product: null };
						}
					}),
				);

				// Sort by most recent first using normalized timestamps.
				enrichedOrders.sort((a, b) => {
					const aTime = getOrderTimestampMs(a) ?? 0;
					const bTime = getOrderTimestampMs(b) ?? 0;
					return bTime - aTime;
				});
				console.log("Enriched orders:", enrichedOrders);
				setOrders(enrichedOrders);
			} else {
				console.log("Failed response or empty escrows");
				setError("Failed to load orders");
			}
		} catch (err) {
			console.error("Error fetching orders:", err);
			setError("Failed to load orders: " + err.message);
		} finally {
			setLoading(false);
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case "PENDING_PAYMENT":
				return "bg-amber-500";
			case "FUNDED":
				return "bg-blue-500";
			case "SHIPPED":
				return "bg-purple-500";
			case "DELIVERED":
				return "bg-green-500";
			case "RELEASED":
				return "bg-emerald-600";
			case "DISPUTED":
				return "bg-red-500";
			case "REFUNDED":
				return "bg-gray-500";
			case "CANCELLED":
				return "bg-gray-400";
			default:
				return "bg-slate-400";
		}
	};

	const getStatusText = (status) => {
		switch (status) {
			case "PENDING_PAYMENT":
				return "Payment Pending";
			case "FUNDED":
				return "Payment Received";
			case "SHIPPED":
				return "Shipped";
			case "DELIVERED":
				return "Delivered";
			case "RELEASED":
				return "Completed";
			case "DISPUTED":
				return "Disputed";
			case "REFUNDED":
				return "Refunded";
			case "CANCELLED":
				return "Cancelled";
			default:
				return status;
		}
	};

	if (loading) {
		return (
			<div className="section-container mt-12 mb-24 flex items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500 mx-auto mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">
						Loading your orders...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="section-container mt-12 mb-24">
				<div className="text-center">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
						<svg
							className="w-8 h-8 text-red-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
						Unable to Load Orders
					</h3>
					<p className="text-slate-600 dark:text-slate-400 mb-6">
						We're having trouble loading your orders. Please try again.
					</p>
					<div className="flex gap-4 justify-center">
						<button onClick={fetchOrders} className="btn-secondary">
							Try Again
						</button>
						<button
							onClick={() => navigate("/browse")}
							className="btn-gradient"
						>
							Browse Marketplace
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="section-container mt-6 sm:mt-12 mb-12 sm:mb-24 px-4 sm:px-6">
			<div className="max-w-6xl mx-auto">
				{" "}
				{/* Back Button */}
				<div className="mb-6">
					<button
						onClick={() => navigate(-1)}
						className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
					>
						<svg
							className="w-5 h-5"
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
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white mb-4">
						My <span className="text-gradient">Orders</span>
					</h1>
					<p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
						Track your purchases, communicate with sellers, and manage your
						transaction history.
					</p>
				</div>
				{/* Orders List */}
				{orders.length === 0 ? (
					<div className="glass-panel p-12 text-center">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
							<svg
								className="w-8 h-8 text-slate-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
								/>
							</svg>
						</div>
						<h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
							No Orders Yet
						</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-6">
							You haven't purchased any items yet. Start exploring our
							marketplace to find great deals!
						</p>
						<button
							onClick={() => navigate("/browse")}
							className="btn-gradient"
						>
							Browse Marketplace
						</button>
					</div>
				) : (
					<div className="space-y-6">
						{orders.map((order) => {
							const orderTimestamp = getOrderTimestampMs(order);
							const orderDateTime = orderTimestamp
								? new Date(orderTimestamp).toLocaleString()
								: "Date unavailable";

							return (
								<div
									key={order.escrow_id}
									className="glass-panel p-6 hover:shadow-xl transition-all duration-300 cursor-pointer"
									onClick={() => navigate(`/escrow/${order.escrow_id}`)}
								>
									<div className="flex flex-col lg:flex-row lg:items-center gap-6">
										{/* Product Image */}
										<div className="flex-shrink-0 w-20 sm:w-24 aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800">
											{order.product?.images?.[0] ||
											order.product?.image_url ? (
												<img
													src={getImageUrl(
														order.product.images?.[0] ||
															order.product.image_url,
													)}
													alt={order.product.title}
													className="w-full h-full object-contain"
													onError={(e) => {
														e.target.src =
															"https://via.placeholder.com/100x100?text=No+Image";
													}}
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<svg
														className="w-8 h-8 text-slate-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth="2"
															d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
														/>
													</svg>
												</div>
											)}
										</div>

										{/* Order Details */}
										<div className="flex-1 min-w-0">
											<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
												<div className="flex-1">
													<h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
														{order.product?.title || "Product"}
													</h3>
													<p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
														Escrow ID: {order.escrow_id}
													</p>
													<div className="flex items-center gap-4 text-sm">
														<span className="text-slate-500 dark:text-slate-400">
															Ordered: {orderDateTime}
														</span>
													</div>
												</div>

												<div className="flex flex-col sm:items-end gap-2">
													<div className="text-right">
														<p className="text-2xl font-bold text-slate-900 dark:text-white">
															{formatPrice(order.ledger?.amount || 0)}
														</p>
													</div>

													{/* Status Badge */}
													<div className="flex items-center gap-2">
														<div
															className={`w-3 h-3 rounded-full ${getStatusColor(order.status_matrix?.escrow_status)}`}
														></div>
														<span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
															{getStatusText(
																order.status_matrix?.escrow_status,
															)}
														</span>
													</div>
												</div>
											</div>

											{/* Action Hint */}
											<div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
												<p className="text-sm text-brand-600 dark:text-brand-400 font-medium">
													Click to view transaction details and message the
													seller →
												</p>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default MyOrders;
