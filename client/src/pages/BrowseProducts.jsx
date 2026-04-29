import React from "react";
import ProductCatalog from "../components/listings/ProductCatalog";

const BrowseProducts = () => {
	return (
		<div className="min-h-screen py-6 sm:py-10 transition-colors duration-500">
			<div className="section-container text-center !pb-6 sm:!pb-10 px-4 sm:px-6">
				<p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">
					Curated Marketplace
				</p>
				<h1 className="mt-2 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white">
					Explore Premium{" "}
					<span className="text-gradient">Second-Hand Inventory</span>
				</h1>
				<p className="mt-3 sm:mt-6 mx-auto max-w-2xl text-xs sm:text-sm md:text-lg text-slate-600 dark:text-slate-400">
					Connect with trusted sellers and browse high-quality pre-owned
					products. Use our AI filters to find specific items or verify
					authenticity instantly.
				</p>
			</div>

			<div className="section-container !py-0 px-4 sm:px-6">
				<div className="glass-panel p-1">
					<ProductCatalog />
				</div>
			</div>
		</div>
	);
};

export default BrowseProducts;
