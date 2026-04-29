import React, { useEffect, useState } from "react";
import {
	getProduct,
	getProductRecommendations,
	updateListingLogoVisibility,
	verifyListingLogo,
	initializeEscrow,
	getUserWatchlist,
	addToWatchlist,
	removeFromWatchlist,
} from "../services/api";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";
import FeedbackForm from "../components/feedback/FeedbackForm";
import FeedbackList from "../components/feedback/FeedbackList";

const ProductDetails = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [escrowLoading, setEscrowLoading] = useState(false);
	const [wishlisted, setWishlisted] = useState(false);
	const [shareStatus, setShareStatus] = useState("");
	const [recommendations, setRecommendations] = useState([]);
	const [recommendationLoading, setRecommendationLoading] = useState(true);
	const [feedbackRefresh, setFeedbackRefresh] = useState(0);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const [logoVerifyFile, setLogoVerifyFile] = useState(null);
	const [logoVerifyLoading, setLogoVerifyLoading] = useState(false);
	const [logoVerifyError, setLogoVerifyError] = useState("");
	const [logoVisibilityLoading, setLogoVisibilityLoading] = useState(false);
	const [logoVisibilityError, setLogoVisibilityError] = useState("");

	const isOwner =
		user?.uid &&
		(product?.user_id === user.uid ||
			product?.seller_id === user.uid ||
			product?.owner_id === user.uid);

	const handleBuy = async () => {
		if (isOwner) {
			return;
		}

		setEscrowLoading(true);
		try {
			let buyerId =
				user?.uid || localStorage.getItem("escrow_user_id") || "demo_buyer";
			localStorage.setItem("escrow_user_id", buyerId);
			localStorage.setItem("escrow_user_role", "BUYER");

			const res = await initializeEscrow({
				product_id: product.id || product._id,
				buyer_id: buyerId,
				seller_id:
					product.seller_id ||
					product.user_id ||
					product.owner_id ||
					"demo_seller",
				amount: product.price,
			});

			if (res.success) {
				// Navigate to the new escrow
				navigate(`/escrow/${res.escrow_id}`);
			}
		} catch (err) {
			alert("Escrow Initiation Failed: " + err.message);
		} finally {
			setEscrowLoading(false);
		}
	};

	useEffect(() => {
		fetchProduct();
		fetchRecommendations();
	}, [id]);

	useEffect(() => {
		if (user?.uid) {
			fetchWatchlistStatus();
		} else {
			setWishlisted(false);
		}
	}, [user, id]);

	const fetchProduct = async () => {
		try {
			const res = await getProduct(id);
			if (res.success) {
				setProduct(res.product);
				setLogoVerifyError("");
				setLogoVisibilityError("");
			}
		} catch (err) {
			console.error("Error loading product:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyLogo = async () => {
		if (!isOwner) {
			return;
		}
		if (!logoVerifyFile) {
			setLogoVerifyError("Please upload a clear logo image first.");
			return;
		}
		setLogoVerifyLoading(true);
		setLogoVerifyError("");
		try {
			const brandHint = String(product?.brand || "").trim();
			const res = await verifyListingLogo({
				productId: id,
				imageFile: logoVerifyFile,
				brand: brandHint || undefined,
			});
			if (res?.success === false) {
				throw new Error(res?.error || "Logo verification failed.");
			}
			if (res?.product) {
				setProduct(res.product);
			}
			setLogoVerifyFile(null);
		} catch (err) {
			setLogoVerifyError(err.message);
		} finally {
			setLogoVerifyLoading(false);
		}
	};

	const handleSetLogoVisibility = async (logoVisible) => {
		if (!isOwner) {
			return;
		}

		setLogoVisibilityLoading(true);
		setLogoVisibilityError("");
		setLogoVerifyError("");

		try {
			const res = await updateListingLogoVisibility({
				productId: id,
				logoVisible,
			});
			if (res?.success === false) {
				throw new Error(res?.error || "Could not update logo visibility.");
			}
			if (res?.product) {
				setProduct(res.product);
			}
			setLogoVerifyFile(null);
		} catch (err) {
			setLogoVisibilityError(err.message);
		} finally {
			setLogoVisibilityLoading(false);
		}
	};

	const fetchRecommendations = async () => {
		try {
			setRecommendationLoading(true);
			const res = await getProductRecommendations(id);
			if (res.success) setRecommendations(res.recommendations || []);
		} catch (err) {
			console.error("Error loading recommendations:", err);
		} finally {
			setRecommendationLoading(false);
		}
	};

	const fetchWatchlistStatus = async () => {
		if (!user?.uid) {
			setWishlisted(false);
			return;
		}

		try {
			const res = await getUserWatchlist(user.uid);
			if (res.success) {
				setWishlisted(res.watchlist.some((item) => item.product_id === id));
			}
		} catch (err) {
			console.error("Error loading watchlist status:", err);
		}
	};

	const handleWishlist = async () => {
		if (!user?.uid) {
			alert("Please sign in to save items to your wishlist.");
			return;
		}

		try {
			if (wishlisted) {
				const res = await removeFromWatchlist(user.uid, id);
				if (res.success) {
					setWishlisted(false);
				}
			} else {
				const res = await addToWatchlist({
					user_id: user.uid,
					product_id: id,
				});
				if (res.success) {
					setWishlisted(true);
				}
			}
		} catch (err) {
			console.error("Watchlist update failed:", err);
		}
	};

	const handleShare = async () => {
		const shareData = {
			title: product.title,
			text: `Check out this ${product.title} on TradeSmart Platform!`,
			url: window.location.href,
		};

		try {
			if (navigator.share) {
				await navigator.share(shareData);
			} else {
				await navigator.clipboard.writeText(window.location.href);
				setShareStatus("Link Copied!");
				setTimeout(() => setShareStatus(""), 2000);
			}
		} catch (err) {
			console.error("Error sharing:", err);
		}
	};

	const getImageUrl = (url) => {
		if (!url) return null;
		if (url.startsWith("http")) return url;
		if (url.startsWith("/uploads/")) return `http://localhost:5050${url}`;
		return null;
	};

	if (loading) {
		return (
			<div className="section-products min-h-screen flex justify-center items-center transition-colors duration-300">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (!product) {
		return (
			<div className="section-products min-h-screen text-center py-20 transition-colors duration-300">
				<h2 className="text-xl font-semibold text-gray-700 dark:text-gray-400 transition-colors duration-300">
					Product not found
				</h2>
				<Link
					to="/browse"
					className="text-indigo-600 dark:text-indigo-400 underline transition-colors duration-300"
				>
					Go Back
				</Link>
			</div>
		);
	}

	const sellerId = product?.seller_id || product?.user_id || product?.owner_id;
	const sellerLabel =
		product?.seller_name || product?.seller_username || sellerId || "Seller";
	const sellerLink = sellerId ? `/seller/${sellerId}` : "/browse";

	const rawLogoStatus = product?.logo_status;
	const rawLogoVerifyStatus = product?.logo_verify_status;
	const normalizedLogoStatus =
		typeof rawLogoStatus === "string" ? rawLogoStatus.trim().toLowerCase() : "";
	const normalizedLogoVerifyStatus =
		typeof rawLogoVerifyStatus === "string"
			? rawLogoVerifyStatus.trim().toLowerCase()
			: "";
	const verificationIsGenuine =
		typeof product?.logo_verification?.is_genuine === "boolean"
			? product.logo_verification.is_genuine
			: null;

	let logoStatus = normalizedLogoStatus;
	let logoVerifyStatus = normalizedLogoVerifyStatus;
	let logoVisible =
		typeof product?.logo_visible === "boolean" ? product.logo_visible : null;

	if (verificationIsGenuine !== null) {
		logoStatus = logoStatus || (verificationIsGenuine ? "verified" : "counterfeit");
		logoVerifyStatus =
			logoVerifyStatus || (verificationIsGenuine ? "genuine" : "fake");
		logoVisible = true;
	}

	if (!logoStatus) {
		if (logoVisible === false) {
			logoStatus = "not available";
		} else if (logoVisible === true) {
			logoStatus = "unverified";
		} else {
			logoStatus = "unknown";
		}
	}

	if (!logoVerifyStatus) {
		if (logoStatus === "verified") {
			logoVerifyStatus = "genuine";
		} else if (logoStatus === "counterfeit") {
			logoVerifyStatus = "fake";
		} else if (logoStatus === "not available") {
			logoVerifyStatus = "logo unavailable";
		} else if (logoStatus === "unverified") {
			logoVerifyStatus = "unverified";
		} else {
			logoVerifyStatus = "unknown";
		}
	}

	if (logoStatus === "verified" || logoStatus === "counterfeit") {
		logoVisible = true;
	} else if (logoStatus === "not available") {
		logoVisible = false;
	}

	const logoIsVerified =
		logoVerifyStatus === "verified" ||
		logoVerifyStatus === "genuine" ||
		logoVerifyStatus === "fake" ||
		logoVerifyStatus === "counterfeit";
	const logoStatusUnknown =
		logoStatus === "unknown" || logoVerifyStatus === "unknown";
	const logoIsGenuine =
		logoVerifyStatus === "verified" || logoVerifyStatus === "genuine"
			? true
			: logoVerifyStatus === "fake" || logoVerifyStatus === "counterfeit"
				? false
				: verificationIsGenuine !== null
					? verificationIsGenuine
					: undefined;

	const logoLabel =
		logoStatusUnknown
			? "Logo status not set"
			: logoVerifyStatus === "logo unavailable" || logoVisible === false
			? "Logo not present"
			: logoIsVerified
				? "Logo verified"
				: "Logo not verified";
	const verdictBrand = String(
		product?.brand || product?.logo_verification?.best_brand_match || "",
	).trim();
	const logoVerdictLabel =
		logoVisible !== false && logoIsVerified
			? logoIsGenuine
				? `Genuine Product${verdictBrand ? ` ${verdictBrand}` : ""}`
				: `Counterfeit Product${verdictBrand ? ` ${verdictBrand}` : ""}`
			: "";
	const logoCardClasses =
		logoStatusUnknown
			? "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300"
			: logoVerifyStatus === "logo unavailable" || logoVisible === false
			? "border-slate-200/30 bg-slate-500/5 text-slate-600 dark:text-white/70"
			: logoVerifyStatus === "genuine" ||
				  (logoIsVerified && logoIsGenuine === true)
				? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
				: logoVerifyStatus === "fake" ||
					  (logoIsVerified && logoIsGenuine === false)
					? "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
					: "border-slate-200/30 bg-slate-500/5 text-slate-600 dark:text-white/70";

	const authenticityBadgeLabel =
		logoStatusUnknown
			? "Status not set"
			: logoVerifyStatus === "genuine" || logoVerifyStatus === "verified"
			? "Verified"
			: logoVerifyStatus === "fake" || logoVerifyStatus === "counterfeit"
				? "Counterfeit"
				: logoVerifyStatus === "logo unavailable"
					? "Not available"
					: "Unverified";
	const authenticityBadgeClasses =
		logoStatusUnknown
			? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/10"
			: logoVerifyStatus === "genuine" || logoVerifyStatus === "verified"
			? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
			: logoVerifyStatus === "fake" || logoVerifyStatus === "counterfeit"
				? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/10"
				: "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200/40 dark:border-white/10";

	const canVerifyLogo =
		isOwner && logoVisible === true && !logoIsVerified && !logoStatusUnknown;

	return (
		<div className="min-h-screen py-6 transition-colors duration-500">
			<div className="section-container">
				{/* Back Button */}
				<div className="mb-6">
					<Link
						to="/browse"
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
						Back to Marketplace
					</Link>
				</div>

				{/* Main Product Layout */}
				<div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-12 group">
					{/* Left Column: Visuals */}
					<div className="md:col-span-7 space-y-6">
						<div className="glass-panel overflow-hidden relative min-h-[360px] sm:min-h-[520px] bg-slate-100/80 dark:bg-slate-900/60 rounded-[2rem]">
							<div className="absolute inset-0 bg-grid-subtle opacity-10"></div>
							{product.image_urls?.length > 0 || product.image_url ? (
								<>
									<img
										src={getImageUrl(
											product.image_urls?.[currentImageIndex] ||
												product.image_url,
										)}
										alt={product.title}
										className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
									/>
									{/* Navigation arrows */}
									{product.image_urls?.length > 1 && (
										<>
											<button
												onClick={() =>
													setCurrentImageIndex((prev) =>
														prev > 0 ? prev - 1 : product.image_urls.length - 1,
													)
												}
												className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
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
											</button>
											<button
												onClick={() =>
													setCurrentImageIndex((prev) =>
														prev < product.image_urls.length - 1 ? prev + 1 : 0,
													)
												}
												className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
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
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</button>
										</>
									)}
									{/* Thumbnail strip */}
									{product.image_urls?.length > 1 && (
										<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full p-2">
											{product.image_urls.map((_, index) => (
												<button
													key={index}
													onClick={() => setCurrentImageIndex(index)}
													className={`w-3 h-3 rounded-full transition-colors ${
														index === currentImageIndex
															? "bg-white"
															: "bg-white/50"
													}`}
												/>
											))}
										</div>
									)}
								</>
							) : (
								<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900/50">
									<svg
										className="w-20 h-20 opacity-20 mb-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="1"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
									<p className="font-bold uppercase tracking-widest text-xs">
										Awaiting Asset Inspection
									</p>
								</div>
							)}

							{/* Overlay Badges */}
							<div className="absolute top-6 left-6 flex gap-3">
								<span className="glass-panel !rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-slate-950/40 backdrop-blur-md">
									TradeSmart Listing
								</span>
								<span
									className={`glass-panel !rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white ${product.condition?.toLowerCase() === "good" ? "bg-emerald-600/60" : "bg-brand-600/60"}`}
								>
									{product.condition} Condition
								</span>
							</div>
						</div>

						{/* Technical Metadata Bar */}
						<div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-3">
							{[
								{ label: "Purchase Year", value: product.year },
								{ label: "Asset Class", value: product.category },
								{ label: "Brand", value: product.brand || "Authentic" },
							].map((stat) => (
								<div
									key={stat.label}
									className="card-light !p-4 border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/30"
								>
									<p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1">
										{stat.label}
									</p>
									<p className="text-sm font-bold text-slate-900 dark:text-white truncate">
										{stat.value}
									</p>
								</div>
							))}
						</div>
					</div>

					{/* Right Column: Pricing & Action */}
					<div className="lg:col-span-5 space-y-8">
						<div className="space-y-4">
							<span className="text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest text-xs">
								Premium Resale Opportunity
							</span>
							<h1 className="section-heading !text-4xl lg:!text-5xl leading-tight">
								{product.title}
							</h1>
							<div className="flex items-center gap-4">
								<p className="text-4xl font-display font-bold text-slate-900 dark:text-white">
									{formatPrice(product.price)}
								</p>
								<span
									className={`text-xs font-semibold px-2 py-1 rounded border ${authenticityBadgeClasses}`}
								>
									{authenticityBadgeLabel}
								</span>
							</div>
						</div>

						<p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
							{product.description}
						</p>

						<div className={`rounded-2xl border p-5 ${logoCardClasses}`}>
							<p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
								Logo status
							</p>
							<p className="mt-1 text-lg font-bold">{logoLabel}</p>
							{logoVerdictLabel && (
								<p className="mt-1 text-sm font-semibold opacity-90">
									{logoVerdictLabel}
								</p>
							)}

							{logoStatusUnknown && (
								<div className="mt-4 space-y-3">
									<p className="text-sm opacity-90">
										{isOwner
											? "Is the brand logo visible on this item?"
											: "Seller has not set logo visibility yet."}
									</p>

									{isOwner && (
										<div className="grid grid-cols-2 gap-3">
											<button
												type="button"
												onClick={() => handleSetLogoVisibility(true)}
												disabled={logoVisibilityLoading}
												className="btn-secondary !rounded-xl !py-3 !px-4 text-sm font-semibold disabled:opacity-60"
											>
												{logoVisibilityLoading ? "Saving..." : "Yes"}
											</button>
											<button
												type="button"
												onClick={() => handleSetLogoVisibility(false)}
												disabled={logoVisibilityLoading}
												className="btn-secondary !rounded-xl !py-3 !px-4 text-sm font-semibold disabled:opacity-60"
											>
												{logoVisibilityLoading ? "Saving..." : "No"}
											</button>
										</div>
									)}
								</div>
							)}

							{logoVisible === true && logoIsVerified && (
								<div className="mt-3 space-y-2 text-sm opacity-90">
									{typeof product?.logo_verification?.confidence === "number" && (
										<p>
											Match score:{" "}
											{(product.logo_verification.confidence * 100).toFixed(1)}%
										</p>
									)}
									{product?.logo_verification?.explanation && (
										<p>{product.logo_verification.explanation}</p>
									)}
								</div>
							)}

							{logoVisible === true && !logoIsVerified && !logoStatusUnknown && (
								<div className="mt-4 space-y-3">
									<p className="text-xs opacity-80">
										{isOwner
											? "Verify now by uploading a logo image, or you can do it later anytime from this page."
											: "Seller has not verified the logo yet."}
									</p>

									{canVerifyLogo && (
										<>
											<input
												type="file"
												accept="image/*"
												onChange={(e) => {
													setLogoVerifyFile(e.target.files?.[0] || null);
													setLogoVerifyError("");
												}}
												className="input-field py-3 cursor-pointer file:hidden"
											/>
											<button
												type="button"
												onClick={handleVerifyLogo}
												disabled={logoVerifyLoading}
												className="btn-gradient w-full justify-center !py-3 disabled:opacity-60"
											>
												{logoVerifyLoading ? "Verifying..." : "Verify logo"}
											</button>
										</>
									)}
								</div>
							)}

							{logoVisibilityError && (
								<div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400">
									{logoVisibilityError}
								</div>
							)}

							{logoVerifyError && (
								<div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400">
									{logoVerifyError}
								</div>
							)}
						</div>
						{!isOwner && (
							<div className="mt-4 text-sm sm:text-base">
								<p className="text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] text-[10px] mb-2">
									Seller
								</p>
								<Link
									to={sellerLink}
									className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
								>
									{sellerLabel}
								</Link>
							</div>
						)}
						<div className="pt-8 space-y-4 border-t border-slate-200 dark:border-white/5">
							{!isOwner && (
								<button
									onClick={handleBuy}
									disabled={escrowLoading}
									className="btn-gradient w-full !rounded-xl !py-4 text-center disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{escrowLoading
										? "Creating Secure Escrow..."
										: "Secure Buy with Escrow"}
								</button>
							)}
							{!isOwner && (
								<div className="flex gap-4">
									<button
										onClick={handleWishlist}
										className={`btn-secondary flex-1 !rounded-xl !py-3.5 !px-4 text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
											wishlisted
												? "!bg-brand-500 !text-white !border-brand-500"
												: ""
										}`}
									>
										<svg
											className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
											/>
										</svg>
										{wishlisted ? "In Watchlist" : "Save to Watchlist"}
									</button>
									<button
										onClick={handleShare}
										className="btn-secondary !p-3.5 !rounded-xl relative group"
										title="Share"
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
												d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
											/>
										</svg>
										{shareStatus && (
											<span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap animate-fade-in">
												{shareStatus}
											</span>
										)}
									</button>
								</div>
							)}
							{!isOwner && (
								<div className="p-4 bg-brand-500/5 dark:bg-brand-500/10 rounded-2xl border border-brand-500/10">
									<div className="flex items-start gap-4">
										<div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0">
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
													d="M13 10V3L4 14h7v7l9-11h-7z"
												/>
											</svg>
										</div>
										<div>
											<h4 className="text-sm font-bold text-slate-900 dark:text-white">
												AI Suggestion
											</h4>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
												Our ML model suggests this item is priced slightly below
												market average. Excellent procurement opportunity.
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Recommendations Section */}
				<div className="mt-24 space-y-10">
					<div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6">
						<h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
							Related <span className="text-gradient">Products</span>
						</h2>
						<Link
							to="/browse"
							className="text-brand-600 dark:text-brand-400 font-bold text-sm"
						>
							Browse More →
						</Link>
					</div>

					{recommendationLoading ? (
						<div className="flex items-center justify-center py-20">
							<div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
						</div>
					) : recommendations.length === 0 ? (
						<div className="card-light text-center py-20 opacity-50">
							No similar assets currently indexed.
						</div>
					) : (
						<div className="grid gap-4 sm:gap-8 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
							{recommendations.slice(0, 4).map((item) => {
								const recImage = getImageUrl(
									item.image_urls?.[0] || item.image_url,
								);
								return (
									<div key={item.id} className="group cursor-pointer">
										<div className="relative rounded-2xl overflow-hidden aspect-square mb-4 bg-slate-100 dark:bg-slate-900">
											{recImage ? (
												<img
													src={recImage}
													alt={item.title}
													className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center text-slate-400">
													No Image
												</div>
											)}
											<div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
												<Link
													to={`/product/${item.id}`}
													className="w-full btn-gradient !py-2 !text-[10px]"
												>
													View Detail
												</Link>
											</div>
										</div>
										<div>
											<h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1">
												{item.title}
											</h3>
											<p className="text-brand-600 dark:text-brand-400 font-bold text-sm">
												{formatPrice(item.price)}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Feedback Sections - These will inherit the new professional styles */}
				<div
					className={`mt-24 ${!isOwner ? "grid grid-cols-1 lg:grid-cols-2 gap-12" : ""}`}
				>
					<FeedbackList
						productId={id}
						refreshTrigger={feedbackRefresh}
						currentUser={user}
						onDeleteSuccess={() => setFeedbackRefresh((prev) => prev + 1)}
					/>
					{!isOwner && (
						<FeedbackForm
							productId={id}
							productName={product?.title}
							currentUser={user}
							isOwner={isOwner}
							refreshTrigger={feedbackRefresh}
							onFeedbackSubmitted={() => setFeedbackRefresh((prev) => prev + 1)}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProductDetails;
