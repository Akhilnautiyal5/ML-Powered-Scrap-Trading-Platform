import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createListing, verifyLogo } from "../../services/api";
import { LISTING_CATEGORY_OPTIONS } from "../../utils/constants";

const UploadForm = () => {
	const navigate = useNavigate();

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		category: "",
		brand: "",
		condition: "good",
		price: "",
		year: new Date().getFullYear(),
		images: [],
	});

	const [imagePreviews, setImagePreviews] = useState([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [logoVisible, setLogoVisible] = useState(null);
	const [logoVerifyFile, setLogoVerifyFile] = useState(null);
	const [logoVerifyLoading, setLogoVerifyLoading] = useState(false);
	const [logoVerifyError, setLogoVerifyError] = useState("");
	const [logoVerifyResult, setLogoVerifyResult] = useState(null);

	const resetLogoVerification = () => {
		setLogoVerifyFile(null);
		setLogoVerifyLoading(false);
		setLogoVerifyError("");
		setLogoVerifyResult(null);
	};

	const handleChange = (e) => {
		const { name, value, type, files } = e.target;

		if (type === "file") {
			const selectedFiles = Array.from(files);
			const newImages = [...formData.images, ...selectedFiles];
			setFormData((prev) => ({ ...prev, images: newImages }));

			// Create previews
			const newPreviews = selectedFiles.map((file) => {
				return new Promise((resolve) => {
					const reader = new FileReader();
					reader.onload = (event) => resolve(event.target.result);
					reader.readAsDataURL(file);
				});
			});

			Promise.all(newPreviews).then((previews) => {
				setImagePreviews((prev) => [...prev, ...previews]);
			});
			return;
		}

		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const removeImage = (index) => {
		const newImages = formData.images.filter((_, i) => i !== index);
		const newPreviews = imagePreviews.filter((_, i) => i !== index);
		setFormData((prev) => ({ ...prev, images: newImages }));
		setImagePreviews(newPreviews);
	};

	const moveImage = (fromIndex, toIndex) => {
		const newImages = [...formData.images];
		const newPreviews = [...imagePreviews];

		const [movedImage] = newImages.splice(fromIndex, 1);
		const [movedPreview] = newPreviews.splice(fromIndex, 1);

		newImages.splice(toIndex, 0, movedImage);
		newPreviews.splice(toIndex, 0, movedPreview);

		setFormData((prev) => ({ ...prev, images: newImages }));
		setImagePreviews(newPreviews);
	};

	const handleVerifyLogoNow = async () => {
		if (!logoVerifyFile) {
			setLogoVerifyError("Please upload a clear logo image first.");
			return;
		}

		setLogoVerifyLoading(true);
		setLogoVerifyError("");
		setLogoVerifyResult(null);
		try {
			const brandHint = String(formData.brand || "").trim();
			const res = await verifyLogo({
				imageFile: logoVerifyFile,
				brand: brandHint || undefined,
			});
			if (res?.success === false) {
				throw new Error(res?.error || "Logo verification failed.");
			}
			setLogoVerifyResult(res);
		} catch (err) {
			setLogoVerifyError(err.message);
		} finally {
			setLogoVerifyLoading(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");

		if (logoVisible === null) {
			setLoading(false);
			setMessage("Please confirm whether the logo is visible (Yes/No).");
			return;
		}

		try {
			const payload = new FormData();
			payload.append("title", formData.title);
			payload.append("description", formData.description);
			payload.append("category", formData.category);
			payload.append("brand", formData.brand);
			payload.append("condition", formData.condition);
			payload.append("price", String(Number(formData.price)));
			payload.append("year", String(Number(formData.year)));
			payload.append("logo_visible", String(logoVisible));
			if (
				logoVisible === true &&
				typeof logoVerifyResult?.is_genuine === "boolean"
			) {
				payload.append("logo_verification", JSON.stringify(logoVerifyResult));
			}

			formData.images.forEach((file) => {
				payload.append("images", file);
			});

			const result = await createListing(payload);
			if (result.success) {
				setMessage("Product listed successfully.");
				setFormData({
					title: "",
					description: "",
					category: "",
					brand: "",
					condition: "good",
					price: "",
					year: new Date().getFullYear(),
					images: [],
				});
				setImagePreviews([]);
				setLogoVisible(null);
				resetLogoVerification();
				setTimeout(() => navigate("/browse?my_inventory=1"), 800);
			}
		} catch (err) {
			setMessage(err.message);
		} finally {
			setLoading(false);
		}
	};

	const fieldClass =
		"input-field placeholder-gray-500 text-sm md:text-base rounded-2xl";

	const logoStatusLabel =
		logoVerifyResult?.is_genuine === true
			? "Genuine product"
			: logoVerifyResult?.is_genuine === false
				? "Counterfeit product"
				: "Logo not verified";
	const logoStatusClasses =
		logoVerifyResult?.is_genuine === true
			? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
			: logoVerifyResult?.is_genuine === false
				? "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
				: "border-slate-200/30 bg-slate-500/5 text-slate-600 dark:text-white/70";

	return (
		<div className="glass-panel-dark overflow-hidden p-0 shadow-2xl transition-colors duration-300 border border-white/10">
			{/* Header with Gradient Background */}
			<div className="bg-gradient-to-r from-teal-600/20 to-emerald-600/20 p-8 md:p-12 border-b border-white/5 transition-colors duration-300">
				<h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/70 transition-colors duration-300">
					Marketplace Submission
				</h2>
				<p className="mt-2 text-gray-700 dark:text-white/60 transition-colors duration-300 max-w-2xl">
					Upload crisp imagery, highlight condition, and let our ML-driven
					marketplace polish the presentation and suggest verified buyers for
					you.
				</p>
			</div>

			<div className="p-8 md:p-12">
				<form onSubmit={handleSubmit} className="space-y-8">
					<div className="grid gap-6 sm:gap-10 md:grid-cols-2">
						<div className="space-y-4">
							<label className="glass-panel flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 dark:border-white/20 p-8 text-center cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all duration-300">
								<div className="rounded-2xl bg-brand-500/10 p-5 text-brand-600 dark:text-brand-400 transition-colors duration-300 group-hover:scale-110">
									<svg
										className="w-8 h-8"
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
								<div>
									<p className="text-xl font-bold text-slate-800 dark:text-white">
										Upload Product Images
									</p>
									<p className="mt-1 text-sm text-slate-500 dark:text-white/40 max-w-[200px] mx-auto">
										High-resolution PNG, JPG, or WEBP (Max 8MB each)
									</p>
								</div>
								<span className="btn-gradient !py-2 !px-6 !text-xs !rounded-full shadow-lg shadow-brand-500/20">
									Choose Files
								</span>
								<input
									type="file"
									name="images"
									accept="image/*"
									multiple
									onChange={handleChange}
									className="hidden"
								/>
							</label>

							{/* Image Previews with Reordering */}
							{imagePreviews.length > 0 && (
								<div className="space-y-3">
									<h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40">
										Image Order (First image will be primary)
									</h3>
									<div className="grid grid-cols-2 gap-3">
										{imagePreviews.map((preview, index) => (
											<div key={index} className="relative group">
												<img
													src={preview}
													alt={`Preview ${index + 1}`}
													className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-white/10"
												/>
												<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
													<button
														type="button"
														onClick={() => removeImage(index)}
														className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
														title="Remove"
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
																d="M6 18L18 6M6 6l12 12"
															/>
														</svg>
													</button>
													{index > 0 && (
														<button
															type="button"
															onClick={() => moveImage(index, index - 1)}
															className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
															title="Move Up"
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
																	d="M5 15l7-7 7 7"
																/>
															</svg>
														</button>
													)}
													{index < imagePreviews.length - 1 && (
														<button
															type="button"
															onClick={() => moveImage(index, index + 1)}
															className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600"
															title="Move Down"
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
																	d="M19 9l-7 7-7-7"
																/>
															</svg>
														</button>
													)}
												</div>
												<div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
													{index + 1}
												</div>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						<div className="space-y-6">
							<div>
								<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-brand-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
									Product title *
								</label>
								<input
									type="text"
									name="title"
									value={formData.title}
									onChange={handleChange}
									required
									placeholder="Example: MacBook Pro 14”, 2023"
									className={fieldClass}
								/>
							</div>
							<div>
								<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 flex items-center gap-2">
									<svg
										className="w-4 h-4 text-brand-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M4 6h16M4 12h16M4 18h7"
										/>
									</svg>
									Description *
								</label>
								<textarea
									name="description"
									value={formData.description}
									onChange={handleChange}
									rows="5"
									required
									placeholder="Highlight key specs, condition, and any included accessories..."
									className={`${fieldClass} min-h-[160px] resize-none leading-relaxed`}
								/>
							</div>
						</div>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						<div>
							<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
								Category *
							</label>
							<select
								name="category"
								value={formData.category}
								onChange={handleChange}
								required
								className={fieldClass}
							>
								<option value="">Select category</option>
								{LISTING_CATEGORY_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
								Brand
							</label>
							<input
								type="text"
								name="brand"
								value={formData.brand}
								onChange={handleChange}
								placeholder="Samsung, Nike, Apple..."
								className={fieldClass}
							/>
						</div>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						<div>
							<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
								Condition
							</label>
							<select
								name="condition"
								value={formData.condition}
								onChange={handleChange}
								className={fieldClass}
							>
								<option value="excellent">Like New (Mint)</option>
								<option value="good">Good (Normal wear)</option>
								<option value="fair">Fair (Visible use)</option>
								<option value="poor">Needs Repair (Used for parts)</option>
							</select>
						</div>
						<div>
							<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
								Purchase year
							</label>
							<input
								type="number"
								name="year"
								min="1900"
								max={new Date().getFullYear()}
								value={formData.year}
								onChange={handleChange}
								className={fieldClass}
							/>
						</div>
					</div>

					<div>
						<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 flex items-center gap-2">
							<svg
								className="w-4 h-4 text-brand-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Price (₹) *
						</label>
						<input
							type="number"
							name="price"
							value={formData.price}
							onChange={handleChange}
							required
							placeholder="Enter listing amount"
							className={`${fieldClass} text-xl font-bold py-5`}
						/>
					</div>

					<div className="grid gap-6 md:grid-cols-2">
						<div>
							<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
								Logo visible? *
							</label>
							<div className="grid grid-cols-2 gap-3">
								<button
									type="button"
									onClick={() => {
										setLogoVisible(true);
										setLogoVerifyError("");
									}}
									className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-300 ${
										logoVisible === true
											? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
											: "border-slate-200 text-slate-600 dark:border-white/10 dark:text-white/70"
									}`}
								>
									Yes
								</button>
								<button
									type="button"
									onClick={() => {
										setLogoVisible(false);
										resetLogoVerification();
									}}
									className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-300 ${
										logoVisible === false
											? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
											: "border-slate-200 text-slate-600 dark:border-white/10 dark:text-white/70"
									}`}
								>
									No
								</button>
							</div>
							<p className="mt-2 text-xs text-slate-500 dark:text-white/50">
								If you choose No, the product page will show “logo not present”.
							</p>
						</div>

						{logoVisible === true && (
							<div>
								<label className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
									Verify logo (optional)
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={(e) => {
										const file = e.target.files?.[0] || null;
										setLogoVerifyFile(file);
										setLogoVerifyError("");
										setLogoVerifyResult(null);
									}}
									className={`${fieldClass} py-3 cursor-pointer file:hidden`}
								/>
								<div className="mt-3 flex gap-3">
									<button
										type="button"
										onClick={handleVerifyLogoNow}
										disabled={logoVerifyLoading}
										className="btn-gradient flex-1 justify-center !py-3 disabled:opacity-60"
									>
										{logoVerifyLoading ? "Verifying..." : "Verify now"}
									</button>
								</div>
								<p className="mt-2 text-xs text-slate-500 dark:text-white/50">
									You can also verify later from the product details page.
								</p>

								{logoVerifyError && (
									<div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400">
										{logoVerifyError}
									</div>
								)}

								{logoVerifyResult &&
									typeof logoVerifyResult?.is_genuine === "boolean" && (
										<div
											className={`mt-3 rounded-2xl border p-4 ${logoStatusClasses}`}
										>
											<p className="text-xs font-bold uppercase tracking-widest opacity-80">
												Result
											</p>
											<p className="mt-1 text-lg font-bold">
												{logoStatusLabel}
											</p>
											{typeof logoVerifyResult?.confidence === "number" && (
												<p className="mt-1 text-xs opacity-80">
													Match score:{" "}
													{(logoVerifyResult.confidence * 100).toFixed(1)}%
												</p>
											)}
											{logoVerifyResult?.explanation && (
												<p className="mt-2 text-sm opacity-90">
													{logoVerifyResult.explanation}
												</p>
											)}
										</div>
									)}
							</div>
						)}
					</div>

					<div className="pt-4">
						<button
							type="submit"
							disabled={loading}
							className="btn-gradient w-full justify-center py-5 text-xl font-bold shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 disabled:opacity-60 transition-all duration-300 uppercase tracking-widest"
						>
							{loading ? (
								<span className="flex items-center gap-3">
									<div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
									Finalizing Listing...
								</span>
							) : (
								"Publish to Marketplace"
							)}
						</button>
						<p className="mt-4 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em]">
							Verified listings reach 3x more potential buyers.
						</p>
					</div>

					{message && (
						<div
							className={`rounded-2xl border p-5 text-center transition-all duration-300 shadow-lg ${
								message.toLowerCase().includes("success")
									? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
									: "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
							}`}
						>
							<p className="font-bold flex items-center justify-center gap-2">
								{message.toLowerCase().includes("success") ? "✓" : "!"}{" "}
								{message}
							</p>
						</div>
					)}
				</form>
			</div>
		</div>
	);
};

export default UploadForm;
