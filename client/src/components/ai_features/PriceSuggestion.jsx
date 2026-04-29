import React, { useState, useEffect } from "react";
import { formatPrice } from "../../utils/formatPrice";
import { predictPrice, getPriceRange } from "../../services/api";
import { PRICE_CATEGORY_OPTIONS } from "../../utils/constants";
import Loader from "../common/Loader";

const PriceSuggestion = () => {
	const [formData, setFormData] = useState({
		category: "",
		brand: "",
		original_price: "",
		age_years: "",
		condition: "",
		has_warranty: false,
		has_box: false,
	});

	const [prediction, setPrediction] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const [priceRange, setPriceRange] = useState(null);
	const [priceError, setPriceError] = useState(null);

	useEffect(() => {
		let mounted = true;
		const fetchRange = async () => {
			try {
				const res = await getPriceRange();
				if (res && res.success && mounted) {
					setPriceRange(res.data);
				}
			} catch (err) {
				// ignore - range is best-effort
			}
		};
		fetchRange();
		return () => (mounted = false);
	}, []);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;

		// Validate original_price against fetched range
		if (name === "original_price") {
			const num = Number(value);
			if (!isNaN(num) && priceRange) {
				if (num < priceRange.lower || num > priceRange.upper) {
					setPriceError(
						`Price should be between ₹${Math.round(priceRange.lower).toLocaleString()} and ₹${Math.round(priceRange.upper).toLocaleString()}.`,
					);
				} else {
					setPriceError(null);
				}
			} else {
				setPriceError(null);
			}
		}

		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handlePredict = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setPrediction(null);

		try {
			const selectedCategory =
				PRICE_CATEGORY_OPTIONS.find((opt) => opt.value === formData.category)
					?.modelValue || formData.category;

			const payload = {
				...formData,
				category: selectedCategory,
				original_price: Number(formData.original_price),
				age_years: Number(formData.age_years),
			};

			const result = await predictPrice(payload);

			if (result.success) {
				setPrediction(result.data);
			} else {
				setError(result.error || "Prediction failed.");
			}
		} catch (err) {
			setError(
				err?.message ||
					"Unable to connect to the server. Ensure backend is running.",
			);
		} finally {
			setLoading(false);
		}
	};

	const fieldClass =
		"input-field placeholder-gray-500 text-sm md:text-base dark:bg-black/20 dark:border-white/10 dark:text-white transition-all focus:ring-2 focus:ring-emerald-500/50";

	return (
		<div className="glass-panel-dark overflow-hidden p-0 shadow-2xl">
			<div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-8 border-b border-white/5 lg:text-left">
				<h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/70">
					Smart Price Estimator
				</h2>
				<p className="mt-2 text-gray-700 dark:text-white/60">
					AI-powered valuation for your second-hand and used items. Higher
					accuracy with more details.
				</p>
			</div>

			<div className="p-8">
				<form onSubmit={handlePredict} className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
								Category *
							</label>
							<select
								name="category"
								value={formData.category}
								onChange={handleChange}
								required
								className={fieldClass}
							>
								<option value="">Select</option>
								{PRICE_CATEGORY_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
								Brand *
							</label>
							<input
								type="text"
								name="brand"
								value={formData.brand}
								onChange={handleChange}
								required
								placeholder="Apple, Samsung, Dell..."
								className={fieldClass}
							/>
						</div>
					</div>

					<div className="grid gap-6 md:grid-cols-3">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
								Original Price (₹) *
							</label>
							<input
								type="number"
								name="original_price"
								value={formData.original_price}
								onChange={handleChange}
								required
								placeholder="60000"
								className={`${fieldClass} ${priceError ? "border-red-500 ring-1 ring-red-500/20" : ""}`}
							/>
							{priceError && (
								<p className="mt-1 text-xs text-red-500">{priceError}</p>
							)}
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
								Age (Years) *
							</label>
							<input
								type="number"
								step="0.1"
								min="0"
								name="age_years"
								value={formData.age_years}
								onChange={handleChange}
								required
								placeholder="2"
								className={fieldClass}
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
								Condition *
							</label>
							<select
								name="condition"
								value={formData.condition}
								onChange={handleChange}
								required
								className={fieldClass}
							>
								<option value="">Select</option>
								<option value="Excellent">Excellent</option>
								<option value="Good">Good</option>
								<option value="Fair">Fair</option>
								<option value="Poor">Poor</option>
							</select>
						</div>
					</div>


					<div className="flex flex-wrap gap-8 items-center bg-white/5 p-4 rounded-xl border border-white/10">
						<label className="flex items-center gap-3 cursor-pointer group">
							<input
								type="checkbox"
								name="has_warranty"
								checked={formData.has_warranty}
								onChange={handleChange}
								className="w-5 h-5 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-offset-black"
							/>
							<span className="text-sm font-medium text-gray-700 dark:text-white/80 group-hover:text-emerald-400 transition-colors">
								Active Warranty
							</span>
						</label>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="btn-gradient w-full justify-center py-4 text-lg font-semibold shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-60"
					>
						{loading ? (
							<span className="flex items-center gap-2">
								<Loader className="w-5 h-5" /> Analyzing Market Trends...
							</span>
						) : (
							"Calculate Estimated Value"
						)}
					</button>
				</form>

				{error && (
					<div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200 flex items-start gap-3">
						<span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-500 font-bold">
							!
						</span>
						{error}
					</div>
				)}

				{prediction && !error && (
					<div className="mt-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
						<div className="relative glass-panel bg-emerald-500/5 border-emerald-500/20 p-8 rounded-3xl overflow-hidden">
							{/* Decorative background element */}
							<div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

							<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
								<div>
									<p className="text-sm font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
										Recommended Selling Price
									</p>
									<p className="mt-2 text-5xl font-bold text-gray-900 dark:text-white">
										{formatPrice(prediction.predicted_price)}
									</p>
								</div>
								{prediction.price_range && (
									<div className="bg-black/10 dark:bg-black/30 backdrop-blur-md px-4 py-3 rounded-2xl border border-black/5 dark:border-white/10">
										<p className="text-[10px] uppercase tracking-widest text-gray-600 dark:text-white/50 mb-1">
											Market Range
										</p>
										<p className="text-sm font-mono text-emerald-700 dark:text-emerald-300">
											{formatPrice(prediction.price_range.min)} —{" "}
											{formatPrice(prediction.price_range.max)}
										</p>
									</div>
								)}
							</div>

							{prediction.explanations &&
								prediction.explanations.length > 0 && (
									<div className="mt-8 space-y-3">
										<p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40 mb-3">
											Valuation Insights
										</p>
										<div className="grid gap-3 sm:grid-cols-2">
											{prediction.explanations.map((note, idx) => (
												<div
													key={idx}
													className="flex items-center gap-3 text-sm text-gray-700 dark:text-white/80 bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/5"
												>
													<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
													{note}
												</div>
											))}
										</div>
									</div>
								)}

							<div className="mt-8 flex items-center justify-between text-[11px] text-gray-400 dark:text-white/30 border-t border-gray-200 dark:border-white/5 pt-4">
								<span>Valuation generated by Meta-Predict Engine v2.1</span>
								{prediction.confidence_score && (
									<div className="flex items-center gap-2">
										<span>Confidence</span>
										<div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
											<div
												className="h-full bg-emerald-500"
												style={{
													width: `${prediction.confidence_score * 100}%`,
												}}
											></div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PriceSuggestion;
