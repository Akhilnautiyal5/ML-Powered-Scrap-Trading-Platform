import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UploadForm from "../components/listings/UploadForm";
import { useAuth } from "../context/AuthContext";

const SellProduct = () => {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) {
			navigate("/signup");
		}
	}, [loading, navigate, user]);

	if (loading || !user) {
		return null;
	}

	return (
		<div className="min-h-screen py-6 sm:py-10 transition-colors duration-500">
			<div className="section-container text-center !pb-6 sm:!pb-10 px-4 sm:px-6">
				<p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
					Sell Faster & Smarter
				</p>
				<h1 className="mt-2 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white">
					List Your <span className="text-gradient">Pre-owned Assets</span>
				</h1>
				<p className="mt-3 sm:mt-6 mx-auto max-w-2xl text-xs sm:text-sm md:text-lg text-slate-600 dark:text-slate-400">
					Our intelligent listing process helps you showcase products with trust
					indicators, AI-driven pricing, and visual verification to attract
					serious buyers.
				</p>
			</div>

			<div className="section-container !py-0">
				<div className="glass-panel p-8 md:p-12 relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-3xl rounded-full"></div>
					<UploadForm />
				</div>
			</div>
		</div>
	);
};

export default SellProduct;
