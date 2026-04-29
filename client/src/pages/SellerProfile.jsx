import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/listings/ProductCard";
import {
	getSellerProducts,
	getUserById,
	getUserEscrows,
} from "../services/api";

const SellerProfile = () => {
	const navigate = useNavigate();
	const { sellerId } = useParams();
	const [seller, setSeller] = useState(null);
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [successRate, setSuccessRate] = useState({
		percent: null,
		success: 0,
		total: 0,
	});

	useEffect(() => {
		const fetchSeller = async () => {
			setLoading(true);
			setError(null);

			try {
				const [sellerRes, productsRes, escrowsRes] = await Promise.all([
					getUserById(sellerId),
					getSellerProducts(sellerId),
					getUserEscrows(sellerId),
				]);

				if (!sellerRes.success) {
					throw new Error(sellerRes.error || "Seller not found");
				}

				setSeller(sellerRes.user);

				// Success rate: released / total paid escrows for this seller.
				const allEscrows = escrowsRes?.escrows || [];
				const relevantEscrows = allEscrows.filter((e) => {
					if (String(e?.seller_id || "") !== String(sellerId)) return false;
					const paymentStatus = String(
						e?.status_matrix?.payment_status || "PENDING",
					).toUpperCase();
					return paymentStatus !== "PENDING";
				});
				const total = relevantEscrows.length;
				const success = relevantEscrows.filter(
					(e) =>
						String(e?.status_matrix?.escrow_status || "").toUpperCase() ===
						"RELEASED",
				).length;
				const percent = total ? Math.round((success / total) * 100) : null;
				setSuccessRate({ percent, success, total });

				if (productsRes.success) {
					setProducts(productsRes.products || []);
				} else {
					setProducts([]);
				}
			} catch (err) {
				setError(err.message || "Unable to load seller data.");
			} finally {
				setLoading(false);
			}
		};

		fetchSeller();
	}, [sellerId]);

	const getImageUrl = (url) => {
		if (!url) return null;
		if (url.startsWith("http")) return url;
		if (url.startsWith("/uploads/")) return `http://localhost:5050${url}`;
		return null;
	};

	if (loading) {
		return (
			<div className="section-container mt-12 mb-24 flex items-center justify-center">
				<div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-500"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="section-container mt-12 mb-24 text-center">
				<p className="text-lg font-bold text-slate-900 dark:text-white mb-3">
					Unable to load seller profile
				</p>
				<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
					{error}
				</p>
				<Link to="/browse" className="btn-secondary">
					Return to Marketplace
				</Link>
			</div>
		);
	}

	return (
		<div className="section-container py-8">
			<div className="mb-6">
				{/* Back Button */}
				<button
					onClick={() => navigate(-1)}
					className="btn-secondary !py-2.5 !px-5 !text-sm flex items-center gap-2 w-fit"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back
				</button>
			</div>
			<div className="max-w-6xl mx-auto">
				<div className="mb-10 flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 p-8 shadow-xl">
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
						<div>
							<p className="text-xs uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500 mb-2">
								Seller Profile
							</p>
							<h1 className="text-4xl font-display font-black text-slate-900 dark:text-white">
								{seller?.full_name || seller?.username || sellerId}
							</h1>
							<p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
								{seller?.bio ||
									"Trusted marketplace seller with inventory available below."}
							</p>
						</div>

						<div className="space-y-3 text-right">
							<p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-[0.35em]">
								Seller ID
							</p>
							<p className="font-bold text-slate-900 dark:text-white">
								{sellerId}
							</p>
							<Link
								to="/browse"
								className="btn-secondary !py-2.5 !px-5 text-sm"
							>
								Browse Marketplace
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
						<div className="rounded-3xl bg-slate-50 dark:bg-slate-900/40 p-6 border border-slate-200 dark:border-white/10">
							<p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 mb-3">
								Items Available
							</p>
							<p className="text-3xl font-bold text-slate-900 dark:text-white">
								{products.length}
							</p>
						</div>

						<div className="rounded-3xl bg-slate-50 dark:bg-slate-900/40 p-6 border border-slate-200 dark:border-white/10">
							<p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 mb-3">
								Trust Level
							</p>
							<p className="text-3xl font-bold text-brand-600 dark:text-brand-400">
								{successRate.percent === null
									? "N/A"
									: `${successRate.percent}%`}
							</p>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
								Successful transactions: {successRate.success}/
								{successRate.total}
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-6">
					<div className="flex items-center justify-between gap-4">
						<h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
							Seller Inventory
						</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Showing {products.length} item{products.length === 1 ? "" : "s"}
						</p>
					</div>

					{products.length === 0 ? (
						<div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center text-slate-500 dark:text-slate-400">
							No current listings from this seller.
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{products.map((product) => (
								<ProductCard
									key={product.id}
									product={product}
									getImageUrl={getImageUrl}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SellerProfile;
