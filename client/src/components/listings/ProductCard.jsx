import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "../../utils/formatPrice";
import { getProductFeedback } from "../../services/api";

const ProductCard = ({
	product,
	onDelete,
	getImageUrl,
	canDelete = false,
	isWishlisted = false,
	onToggleWishlist,
}) => {
	const navigate = useNavigate();
	const [averageRating, setAverageRating] = useState(0);
	const [totalReviews, setTotalReviews] = useState(0);
	const [loadingRating, setLoadingRating] = useState(true);

	useEffect(() => {
		fetchAverageRating();
	}, [product.id]);

	const fetchAverageRating = async () => {
		try {
			const res = await getProductFeedback(product.id);
			if (res.success && res.feedback.length > 0) {
				const ratings = res.feedback.map((f) => f.rating);
				const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
				setAverageRating(avg);
				setTotalReviews(ratings.length);
			}
		} catch (err) {
			console.error("Error fetching rating:", err);
		} finally {
			setLoadingRating(false);
		}
	};

	const imgSrc = getImageUrl(product.image_urls?.[0] || product.image_url);

	const handleCardClick = () => {
		navigate(`/product/${product.id}`);
	};

	return (
		<div
			onClick={handleCardClick}
			className="relative group card-light flex h-full flex-col !p-0 cursor-pointer transition-all duration-300"
		>
			{/* Background Glow Effect */}
			<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-brand-600/5 via-transparent to-accent-600/10"></div>

			{/* Image Container */}
			<div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 transition-all duration-700 group-hover:scale-[0.98] group-hover:mt-2 group-hover:mx-2 group-hover:w-[calc(100%-1rem)] group-hover:rounded-xl">
				{imgSrc ? (
					<img
						src={imgSrc}
						alt={product.title}
						className="h-full w-full object-contain transition-all duration-700 group-hover:scale-105"
					/>
				) : (
					<div className="h-full w-full flex items-center justify-center text-slate-400 dark:text-slate-500">
						<svg
							className="w-12 h-12"
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
				<div className="absolute bottom-4 left-4">
					<span className="rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
						{product.category || "General"}
					</span>
				</div>
			</div>

			<div className="p-4 sm:p-6 flex flex-col flex-1 relative z-10 pt-3 sm:pt-4">
				<div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
					<h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-2 transition-colors duration-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">
						{product.title}
					</h3>
					<span className="text-lg sm:text-xl font-display font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
						{formatPrice(product.price)}
					</span>
				</div>

				<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
					{product.description}
				</p>

				{/* Metadata Row */}
				<div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-6">
					<span
						className={`px-2 py-1 rounded-full ${
							product.condition === "excellent"
								? "bg-emerald-500/10 text-emerald-600"
								: product.condition === "good"
									? "bg-blue-500/10 text-blue-600"
									: product.condition === "fair"
										? "bg-yellow-500/10 text-yellow-600"
										: "bg-red-500/10 text-red-600"
						}`}
					>
						{product.condition || "Unknown"}
					</span>
					{product.year && <span>Year: {product.year}</span>}
				</div>

				{/* ACTION BUTTONS ROW - Now Below the Text */}
				<div className="mt-auto pt-1 flex items-center justify-between border-slate-100 dark:border-white/5">
					{canDelete ? (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(product.id);
							}}
							className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-center transition-all duration-300 hover:scale-105 text-slate-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5"
							title="Delete Listing"
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
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					) : (
						<div /> // Spacer if no delete button
					)}

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (onToggleWishlist) onToggleWishlist(product.id, isWishlisted);
						}}
						className={`w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-center transition-all duration-300 hover:scale-105 ${
							isWishlisted
								? "text-rose-600 border-rose-100 dark:border-rose-900/30"
								: "text-slate-400"
						}`}
					>
						<svg
							className="w-5 h-5"
							viewBox="0 0 24 24"
							fill={isWishlisted ? "currentColor" : "none"}
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
