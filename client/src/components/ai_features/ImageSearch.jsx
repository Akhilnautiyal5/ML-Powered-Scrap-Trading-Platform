import React, { useState } from "react";
import { formatPrice } from "../../utils/formatPrice";
import { imageSearch } from "../../services/api";
import Loader from "../common/Loader";
import { useNavigate } from "react-router-dom";

import { getProductFeedback,getProduct } from "../../services/api";

const ProductCard = ({
	product=getProduct()
}) => {
	const navigate = useNavigate();
}


const ImageSearch = () => {
	const navigate = useNavigate();
	/* =======================
     STATE
  ======================= */
	const [selectedImage, setSelectedImage] = useState(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [searchResults, setSearchResults] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	/* =======================
     HANDLERS
  ======================= */
	const handleImageSelect = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		setSelectedImage(file);
		setPreviewUrl(URL.createObjectURL(file));
		setSearchResults(null);
		setError(null);
	};

	const handleSearch = async () => {
		if (!selectedImage) {
			setError("Please select an image first.");
			return;
		}

		setLoading(true);
		setError(null);
		setSearchResults(null);

		try {
			const result = await imageSearch(selectedImage);
			setSearchResults(result);
		} catch (err) {
			setError(err?.message || "Failed to search. Ensure backend is running.");
		} finally {
			setLoading(false);
		}
	};

	const resetSearch = () => {
		setSelectedImage(null);
		setPreviewUrl("");
		setSearchResults(null);
		setError(null);
	};

	/* =======================
     UI BLOCKS
  ======================= */
	const fieldClass =
		"input-field placeholder-gray-500 text-sm md:text-base dark:bg-black/20 dark:border-white/10 dark:text-white transition-all focus:ring-2 focus:ring-emerald-500/50";

	const renderHeader = () => (
		<div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-8 border-b border-white/5 lg:text-left">
			<h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/70">
				Visual Search Engine
			</h2>
			<p className="mt-2 text-gray-700 dark:text-white/60">
				Drop an image and let our computer vision model surface listings that
				match shape, texture, and color palettes.
			</p>
		</div>
	);

	const renderUploadBox = () => (
		<label
			htmlFor="image-upload"
			className="relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 bg-black/20 p-6 text-center transition-all hover:border-indigo-500/50 hover:bg-black/30 group"
		>
			<input
				type="file"
				accept="image/*"
				id="image-upload"
				onChange={handleImageSelect}
				className="hidden"
			/>

			{!previewUrl ? (
				<>
					<div className="rounded-full bg-indigo-500/10 p-4 text-indigo-400 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div>
						<p className="text-xl font-semibold text-gray-900 dark:text-white">
							Drag or click to upload
						</p>
						<p className="mt-1 text-sm text-gray-700 dark:text-white/50">
							Supported: PNG, JPG, WEBP (Max 8MB)
						</p>
					</div>
					<span className="btn-gradient px-6 py-2 text-sm shadow-lg shadow-indigo-900/20">
						Choose File
					</span>
				</>
			) : (
				<div className="relative w-full h-full max-h-[400px]">
					<img
						src={previewUrl}
						alt="Preview"
						className="h-64 w-full rounded-2xl object-cover shadow-2xl"
					/>
					<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
						<button
							type="button"
							onClick={resetSearch}
							className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-semibold shadow-xl"
						>
							Change Image
						</button>
					</div>
				</div>
			)}
		</label>
	);

	const renderResults = () => {
		if (loading) {
			return (
				<div className="flex flex-col items-center justify-center py-20">
					<Loader />
					<p className="mt-4 text-indigo-400 font-medium animate-pulse">
						Analyzing visual features...
					</p>
				</div>
			);
		}

		if (!searchResults)
			return (
				<div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
					<div className="w-16 h-16 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
					<p className="text-lg">Results will appear here</p>
				</div>
			);

		if (!searchResults.results || searchResults.results.length === 0) {
			return (
				<div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-gray-700 dark:text-white/70">
					<p className="text-xl font-medium">No direct matches found</p>
					<p className="mt-2 text-sm opacity-60">
						Try uploading a clearer image or a different angle.
					</p>
				</div>
			);
		}

		return (
			<div className="space-y-8">
				<div className="flex items-center justify-between">
					<h3 className="text-xl font-bold text-gray-900 dark:text-white">
						Visual Matches ({searchResults.results.length})
					</h3>
					<div className="h-1 flex-1 mx-4 bg-white/5 rounded-full"></div>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					{searchResults.results.map((result, index) => (
						<div
							key={index}
							onClick={() => navigate(`/product/${result.product_id}`)}
							className="group glass-panel overflow-hidden rounded-3xl border border-white/5 bg-black/20 transition-all hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-900/10"
						>
							<div className="relative h-48 w-full overflow-hidden">
								{result.image_url ? (
									<img
										src={result.image_url}
										alt={result.title}
										className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
									/>
								) : (
									<div className="flex h-full items-center justify-center bg-white/5 text-gray-500 dark:text-white/20">
										No image
									</div>
								)}
								<div className="absolute top-4 left-4">
									<span className="rounded-full bg-emerald-500/20 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
										{result.similarity_percentage}% Match
									</span>
								</div>
							</div>

							<div className="p-5">
								<p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
									{result.category}
								</p>
								<h4 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
									{result.title}
								</h4>

								<div className="mt-4 flex items-center justify-between">
									{result.price !== undefined && (
										<p className="text-xl font-bold text-gray-900 dark:text-white">
											{formatPrice(result.price)}
										</p>
									)}
									<button className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-white/40 hover:text-brand-600 dark:hover:text-white transition-colors">
										View Product →
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		);
	};

	/* =======================
     RENDER
  ======================= */
	return (
		<div className="glass-panel-dark overflow-hidden p-0 shadow-2xl">
			{renderHeader()}

			<div className="p-8">
				<div className="grid gap-10 lg:grid-cols-5">
					{/* LEFT: Upload controls */}
					<div className="lg:col-span-2 space-y-6">
						{renderUploadBox()}

						<button
							onClick={handleSearch}
							disabled={!selectedImage || loading}
							className="btn-gradient w-full justify-center py-4 text-lg font-semibold shadow-xl shadow-indigo-900/10 hover:shadow-indigo-900/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
						>
							{loading ? "Analyzing Features..." : "Find Visual Matches"}
						</button>

						{error && (
							<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200 flex items-start gap-3">
								<span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-500 font-bold">
									!
								</span>
								{error}
							</div>
						)}

						<div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
							<p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
								Model Info
							</p>
							<div className="flex items-center gap-4">
								<div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
										/>
									</svg>
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-800 dark:text-white/90">
										DeepFeature v4.2
									</p>
									<p className="text-[10px] text-slate-500 dark:text-white/40">
										ResNet50 + Triplet Loss Embedding Engine
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* RIGHT: Results */}
					<div className="lg:col-span-3 min-h-[500px]">{renderResults()}</div>
				</div>
			</div>
		</div>
	);
};

export default ImageSearch;
