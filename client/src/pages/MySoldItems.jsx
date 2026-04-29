import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyListings, getUserEscrows } from "../services/api";
import { formatPrice } from "../utils/formatPrice";
import { getImageUrl } from "../utils/imageUtils";

const toDate = (timestamp) => {
	const value = Number(timestamp);
	if (!value) return new Date();
	return new Date(value < 1e12 ? value * 1000 : value);
};

const MySoldItems = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [salesStats, setSalesStats] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const currentUserId = user?.uid || localStorage.getItem("escrow_user_id");
	const identityKeys = new Set(
		[user?.uid, localStorage.getItem("escrow_user_id")].filter(Boolean),
	);

	useEffect(() => {
		if (!currentUserId) return;

		let isMounted = true;

		const loadSoldItems = async (silent = false) => {
			try {
				if (!silent) {
					setLoading(true);
				}

				console.log("Fetching my listings for user:", user?.uid);
				const listingsRes = await getMyListings();
				console.log("getMyListings response:", listingsRes);

				if (!isMounted) return;

				if (listingsRes.success) {
					setProducts(listingsRes.products || []);
				} else {
					console.log("Failed to get listings:", listingsRes);
				}

				console.log("Fetching escrows for identity:", currentUserId);
				const escrowsRes = await getUserEscrows(currentUserId);
				console.log("getUserEscrows response:", escrowsRes);

				if (!isMounted) return;

				if (escrowsRes.success && escrowsRes.escrows) {
					const sellerEscrows = escrowsRes.escrows.filter((escrow) =>
						identityKeys.has(String(escrow.seller_id)),
					);

					console.log("Seller escrows:", sellerEscrows);

					const stats = {};
					sellerEscrows.forEach((escrow) => {
						const productId = escrow.product_id;
						const paymentStatus = String(
							escrow.status_matrix?.payment_status || "PENDING",
						).toUpperCase();
						if (paymentStatus === "PENDING") {
							return;
						}

						if (!stats[productId]) {
							stats[productId] = {
								totalSales: 0,
								totalRevenue: 0,
								completedSales: 0,
								activeSales: 0,
							};
						}

						stats[productId].totalSales += 1;

						if (escrow.status_matrix?.escrow_status === "RELEASED") {
							stats[productId].totalRevenue += escrow.ledger?.amount || 0;
							stats[productId].completedSales += 1;
						} else if (
							!["CANCELLED", "REFUNDED", "DISPUTED"].includes(
								escrow.status_matrix?.escrow_status,
							)
						) {
							stats[productId].activeSales += 1;
						}
					});

					console.log("Sales stats:", stats);
					setSalesStats(stats);
				} else {
					console.log("Failed to get escrows");
				}
			} catch (err) {
				console.error("Error fetching sold items:", err);
				if (!silent) {
					setError("Failed to load sold items: " + err.message);
				}
			} finally {
				if (isMounted && !silent) {
					setLoading(false);
				}
			}
		};

		loadSoldItems(false);

		const interval = setInterval(() => {
			loadSoldItems(true);
		}, 2000);

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				loadSoldItems(true);
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			isMounted = false;
			clearInterval(interval);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [currentUserId, user?.uid]);

	const getProductStats = (productId) => {
		return (
			salesStats[productId] || {
				totalSales: 0,
				totalRevenue: 0,
				completedSales: 0,
				activeSales: 0,
			}
		);
	};

	if (loading) {
		return (
			<div className="section-container mt-12 mb-24 flex items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500 mx-auto mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">
						Loading your sold items...
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
							className="w-8 h-8 text-slate-400"
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
						Unable to Load Items
					</h3>
					<p className="text-slate-600 dark:text-slate-400 mb-6">
						We're having trouble loading your sold items. Please try again.
					</p>
					<div className="flex gap-4 justify-center">
						<button
							onClick={() => window.location.reload()}
							className="btn-secondary"
						>
							Try Again
						</button>
						<button onClick={() => navigate("/sell")} className="btn-gradient">
							List New Item
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
						My <span className="text-gradient">Sold Items</span>
					</h1>
					<p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
						Track your sales performance, manage active transactions, and view
						detailed analytics for each product.
					</p>
				</div>
				{/* Products List */}
				{products.length === 0 ? (
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
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
								/>
							</svg>
						</div>
						<h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
							No Items Listed Yet
						</h3>
						<p className="text-slate-600 dark:text-slate-400 mb-6">
							You haven't listed any items for sale yet. Start selling by
							listing your first product!
						</p>
						<div className="flex gap-4 justify-center">
							<button
								onClick={() => navigate("/sell")}
								className="btn-gradient"
							>
								List Your First Item
							</button>
							<button
								onClick={() => navigate("/browse")}
								className="btn-secondary"
							>
								Browse Marketplace
							</button>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{products.map((product) => {
							const stats = getProductStats(product.id);

							return (
								<div
									key={product.id}
									className="glass-panel p-6 hover:shadow-xl transition-all duration-300"
								>
									<div className="flex gap-4 mb-4">
										{/* Product Image */}
										<div className="flex-shrink-0 w-16 aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800">
											{product.images?.[0] || product.image_url ? (
												<img
													src={getImageUrl(
														product.images?.[0] || product.image_url,
													)}
													alt={product.title}
													className="w-full h-full object-contain"
													onError={(e) => {
														e.target.src =
															"https://via.placeholder.com/64x64?text=No+Image";
													}}
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center">
													<svg
														className="w-6 h-6 text-slate-400"
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

										{/* Product Info */}
										<div className="flex-1 min-w-0">
											<h3 className="font-bold text-slate-900 dark:text-white mb-1 truncate">
												{product.title}
											</h3>
											<p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
												Listed:{" "}
												{toDate(product.created_at).toLocaleDateString()}
											</p>
											<p className="text-lg font-bold text-brand-600 dark:text-brand-400">
												{formatPrice(product.price)}
											</p>
										</div>
									</div>

									{/* Sales Stats - Only visible to seller */}
									<div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
										<div className="text-center">
											<p className="text-2xl font-bold text-slate-900 dark:text-white">
												{stats.totalSales}
											</p>
											<p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
												Total Sales
											</p>
										</div>
										<div className="text-center">
											<p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
												{stats.completedSales}
											</p>
											<p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
												Completed
											</p>
										</div>
										<div className="text-center">
											<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
												{stats.activeSales}
											</p>
											<p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
												Active
											</p>
										</div>
										<div className="text-center">
											<p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
												{formatPrice(stats.totalRevenue)}
											</p>
											<p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
												Revenue
											</p>
										</div>
									</div>

									{/* Action Button */}
									{stats.totalSales > 0 && (
										<div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
											<button
												onClick={() => navigate(`/my-sold-items/${product.id}`)}
												className="w-full btn-secondary !py-2 text-sm"
											>
												View Transactions
											</button>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default MySoldItems;
