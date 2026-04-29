import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, updateUserProfile } from "../services/api";

const MyAddress = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [address, setAddress] = useState({
		street: "",
		city: "",
		state: "",
		zipCode: "",
		country: "",
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (user) {
			fetchUserAddress();
		}
	}, [user]);

	const fetchUserAddress = async () => {
		try {
			const data = await getUserProfile(user.uid);
			if (data && data.profile) {
				const profile = data.profile;
				setAddress({
					street: profile.address_line1 || "",
					city: profile.city || "",
					state: profile.state || "",
					zipCode: profile.postal_code || "",
					country: profile.country || "",
				});
			}
			setLoading(false);
		} catch (err) {
			console.error("Error fetching address:", err);
			setLoading(false);
		}
	};

	const handleInputChange = (field, value) => {
		setAddress((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		setSuccess(false);

		try {
			await updateUserProfile(user.uid, {
				address_line1: address.street,
				city: address.city,
				state: address.state,
				postal_code: address.zipCode,
				country: address.country,
			});
			setSuccess(true);
			setTimeout(() => setSuccess(false), 3000);
		} catch (err) {
			setError(err.message || "Failed to save address");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="section-container mt-12">
				<div className="max-w-2xl mx-auto glass-panel p-12 text-center">
					<div className="inline-block mb-4">
						<div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-brand-500 rounded-full animate-spin"></div>
					</div>
					<p className="text-slate-600 dark:text-slate-400">
						Loading your address...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="section-container mt-6 sm:mt-12 mb-12 px-4 sm:px-6">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<button
						onClick={() => navigate(-1)}
						className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
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
						Back
					</button>
					<h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white mb-2">
						My <span className="text-gradient">Address</span>
					</h1>
					<p className="text-slate-600 dark:text-slate-400">
						Manage your delivery address for orders
					</p>
				</div>

				{error && (
					<div className="mb-6 p-4 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-800 rounded-lg">
						<p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
					</div>
				)}

				{success && (
					<div className="mb-6 p-4 bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-800 rounded-lg">
						<p className="text-green-600 dark:text-green-400 text-sm">
							✓ Address saved successfully!
						</p>
					</div>
				)}

				{/* Address Form */}
				<div className="glass-panel p-6 sm:p-8 space-y-6">
					<div>
						<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
							Street Address
						</label>
						<input
							type="text"
							value={address.street}
							onChange={(e) => handleInputChange("street", e.target.value)}
							placeholder="123 Main St"
							className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								City
							</label>
							<input
								type="text"
								value={address.city}
								onChange={(e) => handleInputChange("city", e.target.value)}
								placeholder="New York"
								className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								State / Province
							</label>
							<input
								type="text"
								value={address.state}
								onChange={(e) => handleInputChange("state", e.target.value)}
								placeholder="NY"
								className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								ZIP / Postal Code
							</label>
							<input
								type="text"
								value={address.zipCode}
								onChange={(e) => handleInputChange("zipCode", e.target.value)}
								placeholder="10001"
								className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
								Country
							</label>
							<input
								type="text"
								value={address.country}
								onChange={(e) => handleInputChange("country", e.target.value)}
								placeholder="United States"
								className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
							/>
						</div>
					</div>

					<button
						onClick={handleSave}
						disabled={saving}
						className="btn-gradient w-full"
					>
						{saving ? "Saving..." : "Save Address"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default MyAddress;
