import React, { useEffect, useState } from "react";
import {
	getListings,
	getUserWatchlist,
	removeFromWatchlist,
} from "../services/api";
import ProductCard from "../components/listings/ProductCard";
import { Link } from "react-router-dom";
import { getImageUrl } from "../utils/imageUtils";
import { useAuth } from "../context/AuthContext";

const Wishlist = () => {
	const { user } = useAuth();
	const [wishlistItems, setWishlistItems] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchWishlistProducts();
	}, [user]);

	const fetchWishlistProducts = async () => {
		try {
			setLoading(true);
			if (!user?.uid) {
				setWishlistItems([]);
				return;
			}

			const watchlistRes = await getUserWatchlist(user.uid);
			if (!watchlistRes.success) {
				setWishlistItems([]);
				return;
			}

			const watchlistIds = watchlistRes.watchlist.map(
				(item) => item.product_id,
			);
			if (watchlistIds.length === 0) {
				setWishlistItems([]);
				return;
			}

			const res = await getListings();
			if (res.success) {
				const filtered = res.products.filter((p) =>
					watchlistIds.includes(p.id),
				);
				setWishlistItems(filtered);
			}
		} catch (err) {
			console.error("Error loading wishlist:", err);
		} finally {
			setLoading(false);
		}
	};

	const removeFromWishlist = async (id) => {
		if (!user?.uid) return;
		try {
			const res = await removeFromWatchlist(user.uid, id);
			if (res.success) {
				setWishlistItems((prev) => prev.filter((item) => item.id !== id));
			}
		} catch (err) {
			console.error("Error removing from wishlist:", err);
		}
	};

	return (
		<div className="min-h-screen py-16 transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
			<div className="section-container">
				<div className="text-center mb-16">
					<p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-600 dark:text-brand-400 mb-4">
						Personal Collection
					</p>
					<h1 className="section-heading">
						Your Premium <span className="text-gradient">Watchlist</span>
					</h1>
					<p className="mt-4 mx-auto max-w-xl text-slate-500 dark:text-slate-400">
						Keep track of exclusive assets and high-value second-hand
						opportunities before you initiate the secure escrow protocol.
					</p>
				</div>

				{loading ? (
					<div className="flex justify-center py-20">
						<div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
					</div>
				) : wishlistItems.length === 0 ? (
					<div className="glass-panel p-20 text-center max-w-2xl mx-auto space-y-6">
						<div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700">
							<svg
								className="w-10 h-10"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="1.5"
									d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
								/>
							</svg>
						</div>
						<h2 className="text-xl font-bold text-slate-900 dark:text-white">
							Watchlist is Empty
						</h2>
						<p className="text-slate-500 dark:text-slate-400">
							You haven't saved any assets yet. Start browsing the marketplace
							to curate your collection.
						</p>
						<Link to="/browse" className="btn-gradient inline-block !px-10">
							Browse Assets
						</Link>
					</div>
				) : (
					<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{wishlistItems.map((product) => (
							<div key={product.id} className="relative group">
								<ProductCard
									product={product}
									getImageUrl={getImageUrl}
									isWishlisted={true}
									onToggleWishlist={removeFromWishlist}
								/>
								<button
									onClick={() => removeFromWishlist(product.id)}
									className="absolute top-4 right-4 z-10 p-2.5 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md rounded-xl text-red-500 border border-slate-200 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hover:scale-110 active:scale-95"
									title="Remove from Watchlist"
								>
									<svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
										<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
									</svg>
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default Wishlist;
