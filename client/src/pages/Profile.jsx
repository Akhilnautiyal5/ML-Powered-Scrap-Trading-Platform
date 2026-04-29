import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
	getUserWatchlist,
	addToWatchlist,
	removeFromWatchlist,
	getUserEarnings,
} from "../services/api";

const Profile = () => {
	const { user, logout, updateProfile } = useAuth();
	const navigate = useNavigate();
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		full_name: "",
		phone: "",
		bio: "",
		profilePic: "",
		address_line1: "",
		address_line2: "",
		city: "",
		state: "",
		postal_code: "",
		country: "",
	});

	// Update formData when user changes
	useEffect(() => {
		if (user) {
			const address = user.address || {};
			setFormData({
				full_name: user.full_name || "",
				phone: user.phone || "",
				bio: user.bio || "",
				profilePic: user.profilePic || "",
				address_line1: address.line1 || user.address_line1 || "",
				address_line2: address.line2 || user.address_line2 || "",
				city: address.city || user.city || "",
				state: address.state || user.state || "",
				postal_code: address.postal_code || user.postal_code || "",
				country: address.country || user.country || "",
			});
		}
	}, [user]);
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [watchlistIds, setWatchlistIds] = useState([]);
	const [earningsData, setEarningsData] = useState({
		currentBalance: 0,
		totalEarned: 0,
		totalCashedOut: 0,
		loading: true,
	});

	useEffect(() => {
		if (user) {
			fetchWatchlist();
			fetchEarningsData();

			const interval = setInterval(() => {
				fetchEarningsData();
			}, 10000);

			return () => clearInterval(interval);
		}
	}, [user]);

	const fetchWatchlist = async () => {
		try {
			const res = await getUserWatchlist(user.uid);
			if (res.success) {
				setWatchlistIds(res.watchlist.map((item) => item.product_id));
			} else {
				setWatchlistIds([]);
			}
		} catch (err) {
			console.error("Error fetching wishlist ids:", err);
			setWatchlistIds([]);
		}
	};

	const fetchEarningsData = async () => {
		try {
			setEarningsData((prev) => ({ ...prev, loading: true }));
			console.log("Fetching earnings for user:", user.uid);
			const earningsRes = await getUserEarnings(user.uid);
			console.log("Earnings response:", earningsRes);

			if (earningsRes.success) {
				const earnings = earningsRes.earnings;
				console.log("Earnings data:", earnings);
				setEarningsData({
					currentBalance: earnings.current_balance || 0,
					totalEarned: earnings.total_earned || 0,
					totalCashedOut: earnings.total_cashed_out || 0,
					loading: false,
				});
			} else {
				console.log("Earnings API failed:", earningsRes);
				setEarningsData({
					currentBalance: 0,
					totalEarned: 0,
					totalCashedOut: 0,
					loading: false,
				});
			}
		} catch (err) {
			console.error("Error fetching earnings data:", err);
			setEarningsData({
				currentBalance: 0,
				totalEarned: 0,
				totalCashedOut: 0,
				loading: false,
			});
		}
	};

	const toggleWishlist = async (productId, currentlyWishlisted) => {
		try {
			if (currentlyWishlisted) {
				await removeFromWatchlist(user.uid, productId);
				setWatchlistIds((prev) => prev.filter((id) => id !== productId));
			} else {
				await addToWatchlist({ user_id: user.uid, product_id: productId });
				setWatchlistIds((prev) => [...prev, productId]);
			}
		} catch (err) {
			console.error("Error toggling wishlist item:", err);
			alert("Unable to update wishlist. Please try again.");
		}
	};

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");

		try {
			const token = localStorage.getItem("token");
			const response = await axios.put(
				"http://localhost:5050/api/auth/profile",
				formData,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			if (response.data.success) {
				updateProfile(formData);
				setIsEditing(false);
				setMessage("Profile updated successfully!");
				setTimeout(() => setMessage(""), 3000);
			}
		} catch (err) {
			setMessage("Failed to update profile. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const getImageUrl = (url) => {
		if (!url) return null;
		if (url.startsWith("http")) return url;
		if (url.startsWith("/uploads/")) return `http://localhost:5050${url}`;
		return null;
	};

	// Redirect if not authenticated
	return (
		<div className="section-container mt-6 sm:mt-12 mb-12 sm:mb-24 px-4 sm:px-6">
			<div className="max-w-4xl mx-auto glass-panel-dark overflow-hidden p-0 shadow-2xl border border-white/10 transition-all duration-500 animate-fade-in">
				{/* Profile Header Block */}
				<div className="bg-gradient-to-r from-brand-600/10 to-accent-600/10 p-10 flex flex-col items-center md:flex-row md:items-start gap-8 border-b border-white/5 shadow-inner">
					<div className="relative group/avatar">
						<div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-brand-500/50 to-emerald-500/50 blur opacity-75 group-hover/avatar:opacity-100 transition-opacity"></div>
						<img
							src={
								user?.profilePic ||
								"https://ui-avatars.com/api/?name=User&background=random"
							}
							alt={user?.username || "User"}
							className="w-32 h-32 rounded-full object-cover border-4 border-white/20 relative animate-float shadow-2xl transition-transform hover:scale-110 duration-700"
							onError={(e) => {
								e.target.src =
									"https://ui-avatars.com/api/?name=User&background=random";
							}}
						/>
					</div>

					<div className="flex-1 text-center md:text-left space-y-4">
						<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
							<div>
								<h2 className="text-4xl font-display font-black text-slate-900 dark:text-white capitalize">
									{user?.full_name || user?.username || "User"}
								</h2>
								<div className="mt-2 flex items-center justify-center md:justify-start gap-4">
									<span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest border border-brand-500/20">
										ID: {user?.username || "Unknown"}
									</span>
									<span className="text-sm font-mono text-slate-500 dark:text-white/40">
										Network Member since{" "}
										{user?.createdAt
											? new Date(user.createdAt).getFullYear()
											: new Date().getFullYear()}
									</span>
								</div>
							</div>

							<div className="flex gap-4">
								<button
									onClick={() => setIsEditing(!isEditing)}
									className="btn-secondary !py-2 !px-5 !text-xs !bg-white/5 hover:!bg-white/10 font-bold uppercase tracking-widest"
								>
									{isEditing ? "Quit Editor" : "Modify Profile"}
								</button>
								<button
									onClick={logout}
									className="px-5 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500/20 transition-all duration-300"
								>
									Terminate Session
								</button>
							</div>
						</div>

						<p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400/80 leading-relaxed italic max-w-xl mx-auto md:mx-0">
							"{user?.bio || "No bio available"}"
						</p>
					</div>
				</div>

				<div className="mb-6 grid gap-3 sm:grid-cols-2">
					<button
						onClick={() => navigate("/my-orders")}
						className="btn-secondary w-full !py-3 !px-5 text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700"
					>
						My Orders
					</button>
					<button
						onClick={() => navigate("/my-sold-items")}
						className="btn-secondary w-full !py-3 !px-5 text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700"
					>
						My Sold Items
					</button>
				</div>

				{/* Earnings Section */}
				<div className="mb-8 p-6 glass-panel-dark border border-white/10 rounded-2xl">
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-xl font-display font-black text-slate-900 dark:text-white">
							Earnings Dashboard
						</h3>
						<button
							onClick={() => navigate("/cashout")}
							className="btn-gradient !py-2 !px-6 text-sm font-bold shadow-lg"
						>
							Cashout Funds
						</button>
					</div>

					{earningsData.loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500"></div>
							<span className="ml-3 text-slate-600 dark:text-slate-400">
								Loading earnings...
							</span>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
							<div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
								<p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
									Available Balance
								</p>
								<p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
									₹{earningsData.currentBalance.toFixed(2)}
								</p>
								<p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
									Ready to cashout
								</p>
							</div>

							<div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
								<p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
									Total Earned
								</p>
								<p className="text-2xl font-black text-blue-700 dark:text-blue-300">
									₹{earningsData.totalEarned.toFixed(2)}
								</p>
								<p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
									All time earnings
								</p>
							</div>

							<div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
								<p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
									Total Cashed Out
								</p>
								<p className="text-2xl font-black text-amber-700 dark:text-amber-300">
									₹{earningsData.totalCashedOut.toFixed(2)}
								</p>
								<p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
									Withdrawn funds
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Dynamic Form / View Area */}
				<div className="p-8 md:p-12">
					{isEditing ? (
						<form
							onSubmit={handleSubmit}
							className="grid grid-cols-1 md:grid-cols-2 gap-10"
						>
							<div className="space-y-6">
								<div>
									<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-3 block">
										Display Name
									</label>
									<input
										type="text"
										name="full_name"
										value={formData.full_name}
										onChange={handleChange}
										className="input-field"
										placeholder="Enter full name"
									/>
								</div>
								<div>
									<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-3 block">
										Communications Line (Phone)
									</label>
									<input
										type="text"
										name="phone"
										value={formData.phone}
										onChange={handleChange}
										className="input-field"
										placeholder="Global comms ID"
									/>
								</div>
								<div>
									<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-3 block">
										Avatar Link (URL)
									</label>
									<input
										type="text"
										name="profilePic"
										value={formData.profilePic}
										onChange={handleChange}
										className="input-field"
										placeholder="Image source endpoint"
									/>
								</div>
							</div>

							<div className="space-y-6 flex flex-col h-full">
								<div className="flex-1 min-h-[140px]">
									<label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-3 block">
										Trader Bio-Data
									</label>
									<textarea
										name="bio"
										value={formData.bio}
										onChange={handleChange}
										className="input-field h-full resize-none leading-relaxed"
										placeholder="Describe your trading philosophy..."
									/>
								</div>
								<div className="space-y-6">
									<h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-3">
										Delivery Address
									</h3>
									<div>
										<label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-2 block">
											Address Line 1
										</label>
										<input
											type="text"
											name="address_line1"
											value={formData.address_line1}
											onChange={handleChange}
											className="input-field"
											placeholder="Street, building, apartment"
										/>
									</div>
									<div>
										<label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-2 block">
											Address Line 2
										</label>
										<input
											type="text"
											name="address_line2"
											value={formData.address_line2}
											onChange={handleChange}
											className="input-field"
											placeholder="Landmark, district"
										/>
									</div>
									<div className="grid gap-6 md:grid-cols-2">
										<div>
											<label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-2 block">
												City
											</label>
											<input
												type="text"
												name="city"
												value={formData.city}
												onChange={handleChange}
												className="input-field"
												placeholder="City"
											/>
										</div>
										<div>
											<label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-2 block">
												State
											</label>
											<input
												type="text"
												name="state"
												value={formData.state}
												onChange={handleChange}
												className="input-field"
												placeholder="State"
											/>
										</div>
									</div>
									<div className="grid gap-6 md:grid-cols-2">
										<div>
											<label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-2 block">
												Postal Code
											</label>
											<input
												type="text"
												name="postal_code"
												value={formData.postal_code}
												onChange={handleChange}
												className="input-field"
												placeholder="ZIP / Postal Code"
											/>
										</div>
										<div>
											<label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/40 mb-2 block">
												Country
											</label>
											<input
												type="text"
												name="country"
												value={formData.country}
												onChange={handleChange}
												className="input-field"
												placeholder="Country"
											/>
										</div>
									</div>
								</div>
							</div>
							<div className="pt-4 flex flex-col gap-4">
								<button
									type="submit"
									disabled={loading}
									className="btn-gradient w-full py-4 text-base font-bold shadow-2xl shadow-brand-500/30 tracking-[0.1em] uppercase"
								>
									{loading ? "Writing to Network..." : "Synchronize Profile"}
								</button>
								{message && (
									<p className="text-center text-sm font-bold text-emerald-500 animate-pulse">
										{message}
									</p>
								)}
							</div>
						</form>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 text-center md:text-left">
							<div className="space-y-2 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
								<p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
									Authorized Account
								</p>
								<p className="text-lg font-bold text-slate-900 dark:text-white">
									{user?.email || "Not available"}
								</p>
							</div>
							<div className="space-y-2 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
								<p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
									Communication Sync
								</p>
								<p className="text-lg font-bold text-slate-900 dark:text-white">
									{user?.phone || "Not Configured"}
								</p>
							</div>
							<div className="space-y-2 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
								<p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
									Profile Completeness
								</p>
								<div className="flex items-center gap-3">
									<div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
										<div className="h-full bg-brand-500 w-[75%]" />
									</div>
									<span className="text-xs font-bold text-brand-600 dark:text-brand-400">
										75%
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Profile;
