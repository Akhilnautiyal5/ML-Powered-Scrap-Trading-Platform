import React, { useState, useEffect } from "react";
import { getProductFeedback, deleteProductFeedback } from "../../services/api";

const FeedbackList = ({
	productId,
	currentUser,
	refreshTrigger,
	onDeleteSuccess,
}) => {
	const [feedbacks, setFeedbacks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [averageRating, setAverageRating] = useState(0);
	const [totalReviews, setTotalReviews] = useState(0);
	const [sortBy, setSortBy] = useState("recent");
	const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);

	useEffect(() => {
		fetchFeedbacks();
	}, [productId, refreshTrigger]);

	const fetchFeedbacks = async () => {
		try {
			setLoading(true);
			const res = await getProductFeedback(productId);
			if (res.success) {
				setFeedbacks(res.feedback || []);
				setAverageRating(res.average_rating || 0);
				setTotalReviews(res.total_reviews || 0);
			}
		} catch (err) {
			console.error("Error loading feedbacks:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteFeedback = async (feedbackId) => {
		if (!currentUser) {
			alert("Please sign in to delete your review.");
			return;
		}

		const confirmed = window.confirm(
			"Delete this review? This action cannot be undone.",
		);
		if (!confirmed) return;

		try {
			setDeletingFeedbackId(feedbackId);
			const res = await deleteProductFeedback(feedbackId, currentUser.uid);
			if (res.success) {
				await fetchFeedbacks();
				if (onDeleteSuccess) {
					onDeleteSuccess();
				}
			} else {
				alert(res.error || "Unable to delete review.");
			}
		} catch (err) {
			console.error("Error deleting feedback:", err);
			alert("Unable to delete review. Please try again.");
		} finally {
			setDeletingFeedbackId(null);
		}
	};

	const getSortedFeedbacks = () => {
		const sorted = [...feedbacks];
		if (sortBy === "recent") {
			return sorted.sort(
				(a, b) => new Date(b.timestamp) - new Date(a.timestamp),
			);
		} else if (sortBy === "highest") {
			return sorted.sort((a, b) => b.rating - a.rating);
		} else if (sortBy === "lowest") {
			return sorted.sort((a, b) => a.rating - b.rating);
		}
		return sorted;
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now - date);
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 1) return "1 day ago";
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const RatingStars = ({ rating }) => {
		return (
			<div className="flex gap-1 items-center">
				{[1, 2, 3, 4, 5].map((star) => (
					<svg
						key={star}
						className={`w-5 h-5 transition-colors duration-300 ${
							star <= rating
								? "text-yellow-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]"
								: "text-gray-300 dark:text-gray-700 fill-current"
						}`}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
					</svg>
				))}
			</div>
		);
	};

	const sortedFeedbacks = getSortedFeedbacks();

	return (
		<div className="mt-6 sm:mt-12">
			<div className="card-light p-4 sm:p-8 rounded-2xl border border-gray-200 dark:border-white/10 transition-colors duration-300">
				{/* Header and Stats */}
				<div className="mb-6 sm:mb-8">
					<h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 transition-colors duration-300">
						Customer Reviews
					</h3>

					{/* Rating Summary */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
						{/* Average Rating */}
						<div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-500/5 dark:to-amber-500/5 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center transition-colors duration-300">
							<p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-4">
								Average Rating
							</p>
							<div className="text-4xl sm:text-5xl font-display font-black text-yellow-500 mb-2">
								{averageRating.toFixed(1)}
							</div>
							<RatingStars rating={Math.round(averageRating)} />
							<p className="text-gray-500 dark:text-gray-500 text-[10px] sm:text-xs mt-2 sm:mt-4 font-medium transition-colors duration-300">
								Based on{" "}
								<span className="text-gray-900 dark:text-white">
									{totalReviews}
								</span>{" "}
								{totalReviews === 1 ? "Verified Review" : "Verified Reviews"}
							</p>
						</div>

						{/* Rating Distribution */}
						<div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 md:col-span-2 transition-colors duration-300">
							<p className="text-gray-600 dark:text-white/60 text-sm mb-4 transition-colors duration-300">
								Rating Breakdown
							</p>
							<div className="space-y-2">
								{[5, 4, 3, 2, 1].map((stars) => {
									const count = feedbacks.filter(
										(f) => f.rating === stars,
									).length;
									const percentage = totalReviews
										? (count / totalReviews) * 100
										: 0;
									return (
										<div key={stars} className="flex items-center gap-4 group">
											<span className="text-gray-600 dark:text-gray-400 text-sm w-12 font-medium transition-colors duration-300 group-hover:text-yellow-500">
												{stars} ★
											</span>
											<div className="flex-1 bg-gray-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden transition-colors duration-300 relative">
												<div
													className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,204,21,0.2)]"
													style={{ width: `${percentage}%` }}
												></div>
											</div>
											<span className="text-gray-500 dark:text-gray-500 text-xs w-10 text-right font-mono transition-colors duration-300">
												{Math.round(percentage)}%
											</span>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				{/* Sort and Filter */}
				{totalReviews > 0 && (
					<div className="mb-8 flex items-center gap-4 pb-8 border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
						<div className="flex items-center gap-3">
							<span className="text-gray-700 dark:text-white/60 text-sm font-semibold transition-colors duration-300">
								Sort Reviews
							</span>
							<div className="relative">
								<select
									id="sort"
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									className="px-4 py-2.5 pl-10 pr-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-blue-500/50 rounded-lg text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-900 dark:[&>option]:text-white [&>option:checked]:bg-blue-600 [&>option:checked]:text-white"
								>
									<option value="recent">📅 Most Recent</option>
									<option value="highest">⭐ Highest Rating</option>
									<option value="lowest">⬇️ Lowest Rating</option>
								</select>
								<div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-600 dark:text-white/60 transition-colors duration-300">
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 14l-7 7m0 0l-7-7m7 7V3"
										/>
									</svg>
								</div>
								<div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-600 dark:text-white/60 transition-colors duration-300">
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
									</svg>
								</div>
							</div>
						</div>

						{/* Active Sort Badge */}
						<div className="ml-auto">
							<span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-medium transition-colors duration-300">
								{sortBy === "recent" && "🔄 Sorted by Date"}
								{sortBy === "highest" && "⭐ Sorted by Rating (High to Low)"}
								{sortBy === "lowest" && "⬇️ Sorted by Rating (Low to High)"}
							</span>
						</div>
					</div>
				)}

				{/* Feedbacks List */}
				{loading ? (
					<div className="flex justify-center py-12">
						<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
					</div>
				) : totalReviews === 0 ? (
					<div className="text-center py-12">
						<div className="text-5xl mb-4">📝</div>
						<p className="text-gray-600 dark:text-white/60 transition-colors duration-300">
							No reviews yet. Be the first to share your feedback!
						</p>
					</div>
				) : (
					<div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
						{sortedFeedbacks.map((feedback) => (
							<div
								key={feedback.id}
								className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors duration-300"
							>
								{/* Review Header */}
								<div className="flex items-start justify-between mb-3">
									<div>
										<p className="text-gray-900 dark:text-white font-semibold transition-colors duration-300">
											{feedback.user_name}
										</p>
										<RatingStars rating={feedback.rating} />
									</div>
									<div className="text-right">
										<p className="text-gray-500 dark:text-white/50 text-sm transition-colors duration-300">
											{formatDate(feedback.timestamp)}
										</p>
										{currentUser?.uid === feedback.user_id && (
											<button
												type="button"
												onClick={() => handleDeleteFeedback(feedback.id)}
												disabled={deletingFeedbackId === feedback.id}
												className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
											>
												{deletingFeedbackId === feedback.id
													? "Deleting..."
													: "Delete"}
											</button>
										)}
									</div>
								</div>

								{/* Review Comment */}
								<p className="text-gray-700 dark:text-white/70 text-sm leading-relaxed transition-colors duration-300">
									{feedback.comment}
								</p>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Custom Scrollbar Styles */}
			<style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.6);
        }
      `}</style>
		</div>
	);
};

export default FeedbackList;
