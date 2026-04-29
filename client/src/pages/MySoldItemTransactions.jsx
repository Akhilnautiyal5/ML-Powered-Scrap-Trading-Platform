import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProduct, getUserEscrows } from "../services/api";
import { formatPrice } from "../utils/formatPrice";
import { getImageUrl } from "../utils/imageUtils";

const toDate = (timestamp) => {
	const value = Number(timestamp);
	if (!value) return new Date();
	return new Date(value < 1e12 ? value * 1000 : value);
};

const getStatusBadge = (status) => {
	const normalized = status?.toUpperCase() || "PENDING";
	switch (normalized) {
		case "FUNDED":
			return "bg-emerald-100 text-emerald-800";
		case "RELEASED":
			return "bg-blue-100 text-blue-800";
		case "DISPUTED":
			return "bg-orange-100 text-orange-800";
		case "CANCELLED":
		case "REFUNDED":
			return "bg-red-100 text-red-800";
		default:
			return "bg-yellow-100 text-yellow-800";
	}
};

const MySoldItemTransactions = () => {
	const { user } = useAuth();
	const { productId } = useParams();
	const navigate = useNavigate();
	const [product, setProduct] = useState(null);
	const [transactions, setTransactions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const identityKeys = new Set(
		[user?.uid, localStorage.getItem("escrow_user_id")].filter(Boolean),
	);

	useEffect(() => {
		if (user && productId) {
			fetchProductTransactions();
		}
	}, [user, productId]);

	const fetchProductTransactions = async () => {
		try {
			setLoading(true);
			const [productRes, escrowsRes] = await Promise.all([
				getProduct(productId),
				getUserEscrows(user.uid),
			]);

			if (productRes?.success) {
				setProduct(productRes.product || productRes);
			} else {
				setProduct(productRes.product || productRes);
			}

			if (escrowsRes?.success && escrowsRes.escrows) {
				const sellerEscrows = escrowsRes.escrows
					.filter(
						(escrow) =>
							identityKeys.has(String(escrow.seller_id)) &&
							escrow.product_id === productId,
					)
					.sort((a, b) => {
						const aTime = toDate(
							a.metadata?.created_at || a.created_at || 0,
						).getTime();
						const bTime = toDate(
							b.metadata?.created_at || b.created_at || 0,
						).getTime();
						return bTime - aTime;
					});

				setTransactions(sellerEscrows);
			} else {
				setTransactions([]);
			}
		} catch (err) {
			console.error("Error loading product transactions:", err);
			setError("Unable to load transactions. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="section-container mt-12 mb-24 flex items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500 mx-auto mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">
						Loading transaction details...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="section-container mt-6 sm:mt-12 mb-12 sm:mb-24 px-4 sm:px-6">
			<div className="max-w-6xl mx-auto">
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

				<div className="text-center mb-8">
					<h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white mb-4">
						Transactions for{" "}
						<span className="text-gradient">{product?.title || "Product"}</span>
					</h1>
					<p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
						Review all buyer purchases for this product and open a transaction
						to message or update shipping status.
					</p>
				</div>

				{error && (
					<div className="glass-panel p-6 mb-6 text-center text-red-500">
						{error}
					</div>
				)}

				<div className="glass-panel p-6">
					<div className="mb-6 sm:flex sm:items-center sm:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900 dark:text-white">
								{product?.title || "Product details"}
							</h2>
							<p className="text-slate-600 dark:text-slate-400 mt-1">
								{product?.description || "No product description available."}
							</p>
						</div>
						{product?.images?.[0] || product?.image_url ? (
							<div className="w-24 aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 mt-4 sm:mt-0">
								<img
									src={getImageUrl(product.images?.[0] || product.image_url)}
									alt={product?.title}
									className="w-full h-full object-contain"
									onError={(e) => {
										e.target.src =
											"https://via.placeholder.com/96x96?text=No+Image";
									}}
								/>
							</div>
						) : null}
					</div>

					{transactions.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-slate-600 dark:text-slate-400">
								No successful transactions yet for this product.
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{transactions.map((escrow) => {
								const status =
									escrow.status_matrix?.escrow_status || escrow.status;
								const timestamp = toDate(
									escrow.metadata?.created_at ||
										escrow.created_at ||
										Date.now(),
								);

								return (
									<div
										key={escrow.escrow_id}
										className="border border-slate-200 dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-slate-950"
									>
										<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<p className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
													Escrow ID: {escrow.escrow_id}
												</p>
												<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
													Buyer: {escrow.buyer_id}
												</h3>
												<p className="text-sm text-slate-600 dark:text-slate-400">
													Amount paid: {formatPrice(escrow.ledger?.amount || 0)}
												</p>
												<p className="text-sm text-slate-600 dark:text-slate-400">
													Status:{" "}
													<span
														className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(status)}`}
													>
														{status || "PENDING"}
													</span>
												</p>
											</div>

											<div className="text-right">
												<p className="text-sm text-slate-500 dark:text-slate-400">
													Created: {timestamp.toLocaleString()}
												</p>
												<button
													onClick={() =>
														navigate(`/escrow/${escrow.escrow_id}`)
													}
													className="mt-3 inline-flex items-center gap-2 btn-secondary !py-2 text-sm"
												>
													View Transaction
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default MySoldItemTransactions;
