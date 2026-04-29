import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	deleteListing,
	getListings,
	getProductFeedback,
	getUserWatchlist,
	addToWatchlist,
	removeFromWatchlist,
} from "../../services/api";
import { LISTING_CATEGORY_OPTIONS } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import ProductCard from "./ProductCard";

const ProductCatalog = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [initialLoad, setInitialLoad] = useState(true);
	const [filtering, setFiltering] = useState(false);
	const [sorting, setSorting] = useState(false);
	const [sortBy, setSortBy] = useState("newest");
	const [productRatings, setProductRatings] = useState({});
	const [filters, setFilters] = useState({
		category: "",
		min_price: "",
		max_price: "",
		search: "",
	});
	const [showMyListings, setShowMyListings] = useState(false);
	const [watchlistIds, setWatchlistIds] = useState([]);

	const debounceRef = useRef(null);

	const { user } = useAuth();

	const toggleButtonClass = !user
		? "cursor-not-allowed opacity-50 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500"
		: showMyListings
			? "cursor-pointer hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-purple-600 to-brand-600 border-purple-400 text-white shadow-purple-500/20"
			: "cursor-pointer hover:scale-[1.02] active:scale-[0.98] bg-slate-100 dark:bg-slate-900 border-transparent text-slate-600 dark:text-white hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-600 hover:to-brand-600 hover:shadow-purple-500/20";

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const search = params.get("search") || "";
		const category = params.get("category") || "";
		const myInventory = params.get("my_inventory") || "";

		const initialFilters = {
			category,
			search,
			min_price: "",
			max_price: "",
		};

		setFilters(initialFilters);
		setShowMyListings(myInventory === "1" || myInventory === "true");
		fetchProducts(
			Object.fromEntries(
				Object.entries(initialFilters).filter(([, v]) => v !== ""),
			),
		);
	}, [location.search]);

	useEffect(() => {
		if (products.length > 0) {
			applySort(products, sortBy);
		}
	}, [sortBy]);

	useEffect(() => {
		// Refetch products when showMyListings changes
		fetchProducts();
	}, [showMyListings]);

	useEffect(() => {
		// Reset showMyListings when user logs out
		if (!user && showMyListings) {
			setShowMyListings(false);
		}
	}, [user, showMyListings]);

	useEffect(() => {
		const fetchUserWatchlist = async () => {
			if (!user?.uid) {
				setWatchlistIds([]);
				return;
			}

			try {
				const res = await getUserWatchlist(user.uid);
				if (res.success) {
					setWatchlistIds(res.watchlist.map((item) => item.product_id));
				}
			} catch (err) {
				console.error("Error loading user watchlist:", err);
			}
		};

		fetchUserWatchlist();
	}, [user]);

	const fetchProducts = async (params = {}, { showLoader = true } = {}) => {
		if (showLoader) setLoading(true);
		try {
			const res = await getListings(params);
			if (res.success) {
				let filteredProducts = res.products;
				// Only show the user's own inventory when requested.
				if (user && showMyListings) {
					filteredProducts = res.products.filter(
						(product) => product.user_id === user.uid,
					);
				}
				setProducts(filteredProducts);
				// Fetch ratings for visible products
				await fetchAllProductRatings(filteredProducts);
			}
		} catch {
			setProducts([]);
		} finally {
			if (showLoader) setLoading(false);
			setInitialLoad(false);
		}
	};

	const toggleWishlist = async (productId, currentlyWishlisted) => {
		if (!user?.uid) {
			alert("Please sign in to use your wishlist.");
			return;
		}

		try {
			if (currentlyWishlisted) {
				const res = await removeFromWatchlist(user.uid, productId);
				if (res.success) {
					setWatchlistIds((prev) => prev.filter((id) => id !== productId));
				}
			} else {
				const res = await addToWatchlist({
					user_id: user.uid,
					product_id: productId,
				});
				if (res.success) {
					setWatchlistIds((prev) => [...prev, productId]);
				}
			}
		} catch (err) {
			console.error("Error toggling wishlist:", err);
		}
	};

	const fetchAllProductRatings = async (productsToRate) => {
		try {
			const ratings = {};
			await Promise.all(
				productsToRate.map(async (product) => {
					try {
						const res = await getProductFeedback(product.id);
						if (res.success) {
							ratings[product.id] = {
								average_rating: res.average_rating || 0,
								total_reviews: res.total_reviews || 0,
							};
						}
					} catch (err) {
						console.error(`Error fetching rating for ${product.id}:`, err);
					}
				}),
			);
			setProductRatings(ratings);
		} catch (err) {
			console.error("Error fetching ratings:", err);
		}
	};

	const applySort = async (productsToSort, sortType) => {
		setSorting(true);
		try {
			let sorted = [...productsToSort];

			switch (sortType) {
				case "price-low":
					sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
					break;
				case "price-high":
					sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
					break;
				case "rating":
					sorted.sort((a, b) => {
						const ratingA = productRatings[a.id]?.average_rating || 0;
						const ratingB = productRatings[b.id]?.average_rating || 0;
						return ratingB - ratingA;
					});
					break;
				case "condition":
					const conditionOrder = { excellent: 0, good: 1, fair: 2, poor: 3 };
					sorted.sort(
						(a, b) =>
							(conditionOrder[a.condition?.toLowerCase()] || 999) -
							(conditionOrder[b.condition?.toLowerCase()] || 999),
					);
					break;
				case "brand":
					sorted.sort((a, b) => {
						const brandA =
							(a.brand || "").toLowerCase().trim() || "zzz-no-brand";
						const brandB =
							(b.brand || "").toLowerCase().trim() || "zzz-no-brand";
						return brandA.localeCompare(brandB, "en", { sensitivity: "base" });
					});
					break;
				case "newest":
					sorted.sort(
						(a, b) => new Date(b.created_at) - new Date(a.created_at),
					);
					break;
				default:
					sorted.sort(
						(a, b) => new Date(b.created_at) - new Date(a.created_at),
					);
			}

			setProducts(sorted);
		} finally {
			setSorting(false);
		}
	};

	const handleDeleteProduct = async (id) => {
		if (!window.confirm("Delete this product?")) return;
		try {
			const res = await deleteListing(id);
			if (res.success) {
				setProducts((prev) => prev.filter((p) => p.id !== id));
				alert("Product deleted successfully.");
			}
		} catch {
			alert("Failed to delete product.");
		}
	};

	const handleInventoryToggle = () => {
		const nextValue = !showMyListings;
		setShowMyListings(nextValue);

		const params = new URLSearchParams(location.search);
		if (nextValue) {
			params.set("my_inventory", "1");
		} else {
			params.delete("my_inventory");
		}
		navigate(
			`${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`,
			{
				replace: true,
			},
		);
	};

	const handleFilterChange = (e) => {
		const updated = { ...filters, [e.target.name]: e.target.value };
		setFilters(updated);

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			const filtered = Object.fromEntries(
				Object.entries(updated).filter(([, value]) => value !== ""),
			);
			setFiltering(true);
			fetchProducts(filtered, { showLoader: false }).finally(() =>
				setFiltering(false),
			);
		}, 400);
	};

	const clearFilters = () => {
		setFilters({ category: "", min_price: "", max_price: "", search: "" });
		setSortBy("newest");
		setShowMyListings(false);
		navigate(location.pathname);
	};

	const getImageUrl = (url) => {
		if (!url) return null;
		if (url.startsWith("http")) return url;
		if (url.startsWith("/uploads/")) return `http://localhost:5050${url}`;
		return null;
	};

	const fieldClass =
		"input-field placeholder-gray-500 text-sm md:text-base rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10";

	if (initialLoad && loading) {
		return (
			<div className="glass-panel-dark flex items-center justify-center py-16 text-gray-600 dark:text-white/70">
				Loading marketplace...
			</div>
		);
	}

	return (
		<div className="space-y-10 relative animation-fade-in">
			{!initialLoad && (loading || filtering || sorting) && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-slate-950/60 text-white/80 backdrop-blur-sm">
					<div className="flex items-center gap-3">
						<div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white/70"></div>
						<span>
							{loading
								? "Refreshing products..."
								: sorting
									? "Sorting..."
									: "Applying filters..."}
						</span>
					</div>
				</div>
			)}
			<div className="glass-panel-dark p-6">
				<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0">
							<svg
								className="w-6 h-6 text-brand-600 dark:text-brand-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.4em] text-gray-600 dark:text-white/50 font-bold">
								Smart Marketplace
							</p>
							<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
								Find exactly what you need.
							</h3>
						</div>
					</div>
					<button
						onClick={clearFilters}
						className="text-sm font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors uppercase tracking-widest"
					>
						Clear Filters
					</button>
				</div>
				<div className="mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					<div className="lg:col-span-2 relative group">
						<div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2.5"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<input
							type="text"
							name="search"
							value={filters.search}
							onChange={handleFilterChange}
							placeholder="Search items..."
							className={`${fieldClass} pl-11 !bg-slate-50 dark:!bg-slate-950/50`}
						/>
					</div>
					<select
						name="category"
						value={filters.category}
						onChange={handleFilterChange}
						className={fieldClass}
					>
						<option value="">All categories</option>
						{LISTING_CATEGORY_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<div className="flex items-center gap-2">
						<input
							type="number"
							name="min_price"
							value={filters.min_price}
							onChange={handleFilterChange}
							placeholder="Min ₹"
							className={fieldClass}
						/>
						<input
							type="number"
							name="max_price"
							value={filters.max_price}
							onChange={handleFilterChange}
							placeholder="Max ₹"
							className={fieldClass}
						/>
					</div>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className={fieldClass}
					>
						<option value="newest">📅 Newest</option>
						<option value="price-low">💰 Price: Low to High</option>
						<option value="price-high">💎 Price: High to Low</option>
						<option value="rating">⭐ Highest Rating</option>
						<option value="condition">✨ Best Condition</option>
						<option value="brand">🏷️ Brand (A-Z)</option>
					</select>
				</div>
				<div className="flex gap-3 mt-4">
					<Link
						to="/sell"
						className="dark:!bg-slate-950/50 hover:bg-gradient-to-r hover:from-brand-600 hover:to-accent-600 text-white text-sm flex-1 flex items-center justify-center py-3 px-4 rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
					>
						List an item
					</Link>

					<label
						className={`group relative flex-1 flex items-center justify-between py-3 px-6 rounded-2xl font-bold transition-all duration-500 shadow-lg border-2 transform ${toggleButtonClass}`}
						title={!user ? "Sign in to view your inventory" : ""}
					>
						<input
							type="checkbox"
							className="hidden"
							checked={showMyListings}
							onChange={() => user && setShowMyListings(!showMyListings)}
							disabled={!user}
						/>

						<span className="text-sm uppercase tracking-wider select-none transition-colors duration-300">
							{showMyListings ? "show Global Market" : "show My Inventory"}
						</span>

						<div className="w-8 h-8 flex flex-col items-center justify-center space-y-1">
							<div
								className={`h-1 bg-current rounded-lg transition-all duration-300 origin-right ${
									showMyListings
										? "w-full rotate-[-30deg] -translate-y-[2px]"
										: "w-2/3"
								}`}
							></div>
							<div
								className={`h-1 bg-current rounded-lg transition-all duration-300 origin-center ${
									showMyListings
										? "w-full rotate-90 translate-x-3 opacity-0"
										: "w-full"
								}`}
							></div>
							<div
								className={`h-1 bg-current rounded-lg transition-all duration-300 origin-right ${
									showMyListings
										? "w-full rotate-[30deg] translate-y-[2px]"
										: "w-2/3"
								}`}
							></div>
						</div>
					</label>
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{products.length === 0 ? (
					<div className="glass-panel-dark col-span-full p-10 text-center text-white/70">
						{showMyListings
							? "You haven't listed any items yet. Start selling!"
							: "No items found. Refine your search!"}
					</div>
				) : (
					products.map((product, index) => (
						<div
							key={product.id}
							className="animate-slide-up"
							style={{
								animationDelay: `${index * 50}ms`,
								animationFillMode: "both",
							}}
						>
							<ProductCard
								product={product}
								onDelete={handleDeleteProduct}
								getImageUrl={getImageUrl}
								canDelete={showMyListings}
								isWishlisted={watchlistIds.includes(product.id)}
								onToggleWishlist={toggleWishlist}
							/>
						</div>
					))
				)}
			</div>

			{products.length > 0 && (
				<div className="text-center text-white/60">
					Showing {products.length} item{products.length > 1 ? "s" : ""} •
					Sorted by {sortBy === "newest" && "Newest"}
					{sortBy === "price-low" && "Price: Low to High"}
					{sortBy === "price-high" && "Price: High to Low"}
					{sortBy === "rating" && "Highest Rating"}
					{sortBy === "condition" && "Best Condition"}
					{sortBy === "brand" && "Brand"}
				</div>
			)}
		</div>
	);
};

export default ProductCatalog;
