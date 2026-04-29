import React, { useState, useEffect } from "react";
import { submitProductFeedback, getProductFeedback } from "../../services/api";

const FeedbackForm = ({
	productId,
	productName,
	currentUser,
	isOwner,
	refreshTrigger,
	onFeedbackSubmitted,
}) => {
	const [rating, setRating] = useState(5);
	const [hoverRating, setHoverRating] = useState(0);
	const [comment, setComment] = useState("");
	const [userName, setUserName] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [alreadyReviewed, setAlreadyReviewed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!currentUser) {
			setAlreadyReviewed(false);
			return;
		}

		const checkExistingReview = async () => {
			try {
				const res = await getProductFeedback(productId);
				if (res.success) {
					const hasReviewed = (res.feedback || []).some(
						(feedback) => feedback.user_id === currentUser.uid,
					);
					setAlreadyReviewed(hasReviewed);
					if (currentUser.displayName && !userName) {
						setUserName(currentUser.displayName);
					}
				}
			} catch (err) {
				console.error("Error checking existing review:", err);
			}
		};

		checkExistingReview();
	}, [currentUser, productId, refreshTrigger, userName]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!currentUser) {
			setError("Please sign in to submit feedback.");
			return;
		}
		if (isOwner) {
			setError("You cannot rate your own product.");
			return;
		}
		if (alreadyReviewed) {
			setError("You have already submitted feedback for this product.");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const res = await submitProductFeedback({
				product_id: productId,
				user_id: currentUser.uid,
				rating,
				comment,
				user_name: userName || currentUser.displayName || "Anonymous",
			});
			if (res.success) {
				setSubmitted(true);
				if (onFeedbackSubmitted) {
					onFeedbackSubmitted();
				}
				setTimeout(() => {
					setRating(5);
					setComment("");
					setUserName("");
					setSubmitted(false);
				}, 3000);
			} else {
				setError("Failed to submit feedback. Please try again.");
			}
		} catch (err) {
			console.error("Error submitting feedback:", err);
			setError("Error submitting feedback. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (submitted) {
		return (
			<div className="mt-12 p-6 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl backdrop-blur-sm transition-colors duration-300">
				<div className="flex items-center gap-3">
					<div className="text-3xl">✓</div>
					<div>
						<p className="text-emerald-700 dark:text-emerald-300 font-semibold transition-colors duration-300">
							Thank you for your feedback!
						</p>
						<p className="text-emerald-600/70 dark:text-emerald-200/70 text-sm transition-colors duration-300">
							Your review helps other users make better decisions.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const stars = [1, 2, 3, 4, 5];
	const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

	return (
		<div className="mt-12">
			<div className="card-light p-8 rounded-2xl border border-gray-200 dark:border-white/10 transition-colors duration-300">
				{/* Header */}
				<div className="mb-8">
					<h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
						Share Your Experience
					</h3>
					<p className="text-gray-600 dark:text-white/60 transition-colors duration-300">
						Help others by sharing your honest feedback about this product
					</p>
				</div>

				{error && (
					<div className="mb-6 p-4 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl transition-colors duration-300">
						<p className="text-red-700 dark:text-red-300 text-sm transition-colors duration-300">
							{error}
						</p>
					</div>
				)}

				{!currentUser || isOwner || alreadyReviewed ? (
					<div className="mb-6 p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
						{!currentUser && <p>Please sign in to submit a product review.</p>}
						{currentUser && isOwner && <p>You cannot rate your own product.</p>}
						{currentUser && !isOwner && alreadyReviewed && (
							<p>
								You have already submitted feedback for this product. You may
								delete your existing review before posting again.
							</p>
						)}
					</div>
				) : (
					<>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Name Input */}
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-white mb-3 transition-colors duration-300">
									Your Name
								</label>
								<input
									type="text"
									value={userName}
									onChange={(e) => setUserName(e.target.value)}
									className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-300"
									placeholder="Enter your name"
									required
								/>
							</div>

							{/* Star Rating */}
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-white mb-4 transition-colors duration-300">
									Rate This Product
								</label>
								<div className="flex items-center gap-3">
									<div className="flex gap-2">
										{stars.map((r) => (
											<button
												key={r}
												type="button"
												onMouseEnter={() => setHoverRating(r)}
												onMouseLeave={() => setHoverRating(0)}
												onClick={() => setRating(r)}
												className="transition duration-200 transform hover:scale-110 group"
											>
												<svg
													className={`w-10 h-10 transition-all duration-300 ${
														r <= (hoverRating || rating)
															? "text-yellow-400 fill-current drop-shadow-[0_0_12px_rgba(250,204,21,0.5)] scale-110"
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
											</button>
										))}
									</div>
									<span className="text-gray-700 dark:text-white/70 font-medium transition-colors duration-300">
										{hoverRating
											? ratingLabels[hoverRating - 1]
											: ratingLabels[rating - 1]}
									</span>
								</div>
							</div>

							{/* Comment Textarea */}
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-white mb-3 transition-colors duration-300">
									Your Feedback
								</label>
								<textarea
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-300 resize-none"
									placeholder="Share your experience with this product... (minimum 10 characters)"
									rows="5"
									required
								/>
								<p className="text-gray-500 dark:text-white/40 text-xs mt-2 transition-colors duration-300">
									{comment.length} characters
								</p>
							</div>

							{/* Submit Button */}
							<button
								type="submit"
								disabled={loading}
								className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-500 dark:disabled:to-gray-600 text-white font-semibold rounded-xl transition duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
							>
								{loading ? (
									<>
										<span className="inline-block animate-spin">⏳</span>
										Submitting...
									</>
								) : (
									<>
										<span>Send Feedback</span>
										<span>→</span>
									</>
								)}
							</button>
						</form>

						{/* Info Section */}
						<div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 transition-colors duration-300">
							<p className="text-gray-600 dark:text-white/50 text-xs flex items-center gap-2 transition-colors duration-300">
								<span>💡</span>
								Your feedback is valuable and helps us improve the platform.
							</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default FeedbackForm;
