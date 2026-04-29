import React from "react";
import { Link } from "react-router-dom";

const features = [
	{
		title: "AI Price Estimation",
		text: "Leverage advanced machine learning to get accurate market value for your pre-owned items instantly.",
		icon: (
			<svg
				className="w-6 h-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
				/>
			</svg>
		),
	},
	{
		title: "Visual Search",
		text: "Find exactly what you're looking for by simply uploading a photo. Our AI identifies items with precision.",
		icon: (
			<svg
				className="w-6 h-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		),
	},
	{
		title: "Logo Verification",
		text: "Ensure brand authenticity with our neural network-based logo verification system for second-hand electronics.",
		icon: (
			<svg
				className="w-6 h-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
				/>
			</svg>
		),
	},
];

const Home = () => {
	const [searchQuery, setSearchQuery] = React.useState("");

	const handleKeyDown = (e) => {
		if (e.key === "Enter") {
			window.location.href = `/browse?search=${searchQuery}`;
		}
	};

	return (
		<main className="relative overflow-hidden transition-colors duration-500">
			{/* Dynamic Background Elements - Aurora Mesh (Moved to -z-10 for total isolation) */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden bg-mesh-pattern -z-10 select-none">
				<div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-brand-500/10 blur-[100px] rounded-full animate-pulse-slow"></div>
				<div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-accent-500/10 blur-[90px] rounded-full animate-drift"></div>
				{/* Subtle vignette instead of global blur to maintain text sharpness */}
				<div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 dark:via-transparent to-white/40 dark:to-transparent"></div>
			</div>

			<section className="section-container min-h-[85vh] flex flex-col items-center justify-center text-center">
				<div className="max-w-4xl space-y-4 sm:space-y-8 animate-float px-4 sm:px-0">
					<div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 backdrop-blur-md">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
						</span>
						Perfecting Pre-owned Trading
					</div>

					<h1 className="section-heading leading-tight">
						The Smartest Way to Trade <br />
						<span className="text-gradient">Second-Hand Products</span>
					</h1>

					<p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400/80 leading-relaxed transition-colors duration-300">
						A next-generation marketplace powered by AI. Get precise pricing,
						instant visual search, and verified listings for a more efficient
						trading experience.
					</p>

					<div className="flex flex-col gap-6 items-center pt-8 px-4 sm:px-0 w-full">
						{/* Enhanced AI Search Bar */}
						<div className="w-full max-w-2xl relative group/search">
							<div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 via-brand-400/20 to-brand-600/20 blur-2xl opacity-0 group-hover/search:opacity-100 transition-opacity duration-700"></div>

							<div className="relative flex items-center glass-panel !rounded-2xl sm:!rounded-3xl p-1.5 pl-4 sm:pl-5 border-slate-200 dark:border-white/10 shadow-2xl transition-all duration-300 group-focus-within/search:ring-2 group-focus-within/search:ring-brand-500/50">
								<svg
									className="w-4 sm:w-5 h-4 sm:h-5 text-brand-500 shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2.5"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>

								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder={
										window.innerWidth < 768
											? "Search for items..."
											: "Search for iPhones, MacBooks, Sony Cameras..."
									}
									className="bg-transparent border-none focus:ring-0 w-full text-slate-900 dark:text-white px-3 sm:px-4 py-3 placeholder-slate-500 font-medium text-sm"
								/>

								<div className="flex items-center gap-2 pr-2">
									{/* Keyboard Shortcut Hint */}
									<div className="hidden md:flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-400 tracking-tighter shrink-0">
										<span className="opacity-60 mr-1">⌘</span>K
									</div>

									{/* Voice Search (Mock) */}
									<button
										className="p-2 rounded-xl text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors shrink-0"
										aria-label="Voice search"
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
												d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
											/>
										</svg>
									</button>

									<Link
										to={`/browse?search=${searchQuery}`}
										className="btn-gradient !py-2.5 !px-6 !rounded-2xl !text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-shadow"
									>
										Search
									</Link>
								</div>
							</div>

							{/* Quick Filter Indicators below search */}
							<div className="absolute top-full left-4 mt-3 flex items-center gap-3 animate-fade-in">
								<div className="flex -space-x-2">
									{[
										"https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&q=80&w=100",
										"https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&q=80&w=100",
										"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=100",
									].map((img, i) => (
										<div
											key={i}
											className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 overflow-hidden"
										>
											<img
												src={img}
												className="w-full h-full object-cover"
												alt="User"
											/>
										</div>
									))}
								</div>
								<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
									420+ items listed today
								</span>
							</div>
						</div>

						<div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-slate-500">
							<span className="text-slate-400">Popular:</span>
							<Link
								to="/browse?category=electronics"
								className="hover:text-brand-500 transition-colors"
							>
								iPhone 15
							</Link>
							<span className="text-slate-300 dark:text-slate-800">•</span>
							<Link
								to="/browse?category=computers"
								className="hover:text-brand-500 transition-colors"
							>
								MacBook Pro
							</Link>
							<span className="text-slate-300 dark:text-slate-800">•</span>
							<Link
								to="/browse?category=furniture"
								className="hover:text-brand-500 transition-colors"
							>
								Gaming Chairs
							</Link>
						</div>

						<div className="flex gap-4 pt-4">
							<Link
								to="/sell"
								className="btn-secondary !bg-white/50 dark:!bg-white/5"
							>
								Sell an Item
							</Link>
							<Link
								to="/price-predictor"
								className="btn-ghost flex items-center gap-2"
							>
								<span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
								Check Resale Value AI
							</Link>
						</div>
					</div>
				</div>

				{/* Hero Illustration - Lifestyle / Premium Marketplace Shot */}
				<div className="mt-20 relative w-full max-w-6xl rounded-[2.5rem] overflow-hidden glass-panel-dark aspect-[21/10] transition-transform duration-700 hover:scale-[1.01] group/hero shadow-3xl">
					<img
						src="https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&q=80&w=2000"
						alt="Premium Tech Setup"
						className="absolute inset-0 w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-1000"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20"></div>

					<div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
						<div className="space-y-2">
							<span className="text-brand-400 font-bold uppercase tracking-widest text-[10px]">
								Active Node: APAC-01
							</span>
							<h3 className="text-white font-display text-2xl font-bold">
								Premium Resale, Redefined.
							</h3>
						</div>
						<div className="hidden md:flex gap-4">
							<div className="glass-panel !rounded-xl px-4 py-2 flex items-center gap-3">
								<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
								<span className="text-xs text-white/80 font-mono">
									Market: Bullish
								</span>
							</div>
						</div>
					</div>

					{/* Subtle grid on top */}
					<div className="absolute inset-0 opacity-20 bg-grid-subtle"></div>
				</div>
			</section>

			{/* Featured Categories Grid */}
			<div className="section-container !py-32">
				<div className="flex flex-col items-center text-center mb-10 md:mb-16">
					<h2 className="section-heading">
						Shop by <span className="text-gradient">Category</span>
					</h2>
					<p className="section-subheading mt-4 px-4">
						Hand-picked premium assets across all departments.
					</p>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
					{[
						{
							name: "Phones",
							img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400",
							color: "from-blue-500/20",
						},
						{
							name: "Laptops",
							img: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=400",
							color: "from-emerald-500/20",
						},
						{
							name: "Cameras",
							img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400",
							color: "from-amber-500/20",
						},
						{
							name: "Gaming",
							img: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=400",
							color: "from-purple-500/20",
						},
						{
							name: "Audio",
							img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
							color: "from-rose-500/20",
						},
						{
							name: "Drones",
							img: "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?auto=format&fit=crop&q=80&w=400",
							color: "from-cyan-500/20",
						},
					].map((cat) => (
						<Link
							key={cat.name}
							to="/browse"
							className="group relative rounded-3xl overflow-hidden aspect-[4/5] glass-panel transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
						>
							<img
								src={cat.img}
								alt={cat.name}
								className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
							/>
							<div
								className={`absolute inset-0 bg-gradient-to-t ${cat.color} to-transparent opacity-60`}
							></div>
							<div className="absolute inset-x-0 bottom-0 p-6 pt-10 bg-gradient-to-t from-slate-950/80 to-transparent">
								<p className="text-white font-bold text-lg text-center">
									{cat.name}
								</p>
							</div>
						</Link>
					))}
				</div>
			</div>

			{/* Live Market Insights Ticker */}
			<div className="section-container !py-0 !mt-32">
				<div className="glass-panel !rounded-2xl overflow-hidden py-4 border-brand-500/10 bg-brand-500/5">
					<div className="flex items-center gap-8 whitespace-nowrap animate-marquee px-4">
						{[
							{ label: "iPhone 15 Pro", price: "₹72,400", trend: "+2.4%" },
							{ label: "MacBook M3", price: "₹1,24,900", trend: "-1.2%" },
							{ label: "Sony A7 IV", price: "₹1,95,000", trend: "+0.8%" },
							{ label: "Herman Miller", price: "₹84,000", trend: "+5.1%" },
							{ label: "PS5 Slim", price: "₹44,500", trend: "Stable" },
							{ label: "DJI Mini 4", price: "₹68,200", trend: "-3.5%" },
						].map((item, idx) => (
							<div key={idx} className="flex items-center gap-3">
								<span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
									{item.label}
								</span>
								<span className="text-slate-900 dark:text-white font-mono font-bold">
									{item.price}
								</span>
								<span
									className={`text-[10px] font-bold ${item.trend.startsWith("+") ? "text-emerald-500" : item.trend.startsWith("-") ? "text-rose-500" : "text-slate-500"}`}
								>
									{item.trend}
								</span>
								<span className="text-slate-400 dark:text-slate-700 ml-4">
									|
								</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Trending Deals Section - Aesthetic Product Focus */}
			<div className="section-container !py-40">
				<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
					<div className="space-y-4 text-center md:text-left">
						<span className="text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest text-xs">
							Hand-picked for you
						</span>
						<h2 className="section-heading !text-3xl md:!text-4xl text-left md:text-left">
							Trending <span className="text-gradient">Resale Assets</span>
						</h2>
					</div>
					<Link
						to="/browse"
						className="btn-secondary !py-2.5 !px-6 !rounded-xl !text-xs md:!text-sm w-fit mx-auto md:mx-0"
					>
						View Marketplace
					</Link>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
					{[
						{
							title: "iPhone 14 Pro Max",
							price: "₹84,999",
							img: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600",
							cat: "Electronics",
						},
						{
							title: "Sony WH-1000XM5",
							price: "₹18,500",
							img: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&q=80&w=600",
							cat: "Audio",
						},
						{
							title: "Fujifilm X100V Gold",
							price: "₹1,45,000",
							img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600",
							cat: "Cameras",
						},
						{
							title: "Herman Miller Sayl",
							price: "₹42,000",
							img: "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=600",
							cat: "Furniture",
						},
					].map((product, idx) => (
						<div
							key={idx}
							className="group card-light !p-0 overflow-hidden cursor-pointer"
						>
							<div className="aspect-[4/5] relative overflow-hidden bg-slate-100 dark:bg-slate-900">
								<img
									src={product.img}
									alt={product.title}
									className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
								/>
								<div className="absolute top-4 left-4">
									<span className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-800 dark:text-white">
										{product.cat}
									</span>
								</div>
								<div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-gradient-to-t from-slate-950/90 to-transparent">
									<button className="w-full btn-gradient !py-2 !text-xs">
										Quick Inspect
									</button>
								</div>
							</div>
							<div className="p-5">
								<h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">
									{product.title}
								</h3>
								<p className="text-brand-600 dark:text-brand-400 font-bold mt-1">
									{product.price}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* How it Works Section */}
			<div className="mt-40 py-24 glass-panel !rounded-[3rem] border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
				<div className="section-container">
					<div className="text-center mb-12 md:mb-20 px-4">
						<h2 className="section-heading !text-3xl md:!text-4xl">
							Smooth & <span className="text-gradient">Secure</span>
						</h2>
						<p className="section-subheading mt-4 mx-auto">
							Simplified resale powered by modern intelligence.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-12 relative">
						{/* Connector Lines */}
						<div className="hidden lg:block absolute top-1/2 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent"></div>

						{[
							{
								step: "01",
								title: "Snapshot & Scan",
								desc: "Upload images and let our AI categorize and grade the condition instantly.",
							},
							{
								step: "02",
								title: "Smart Pricing",
								desc: "Receive AI-driven market valuations based on real-time global resale data.",
							},
							{
								title: "Verified Trade",
								desc: "Connect with verified buyers and finalize your deal with confidence.",
								step: "03",
							},
						].map((item, idx) => (
							<div
								key={idx}
								className="relative z-10 flex flex-col items-center text-center"
							>
								<div className="w-20 h-20 rounded-3xl glass-panel !bg-brand-500 text-white flex items-center justify-center font-display text-2xl font-black mb-8 shadow-2xl shadow-brand-500/30">
									{item.step}
								</div>
								<h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
									{item.title}
								</h3>
								<p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm px-4">
									{item.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* AI Trust Section */}
			<div className="section-container !py-40">
				<div className="flex flex-col lg:flex-row items-center gap-16">
					<div className="lg:w-1/2">
						<div className="inline-block px-4 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-6">
							Engineered for Trust
						</div>
						<h2 className="section-heading !text-3xl md:!text-4xl text-center md:text-left leading-tight">
							Verified with <span className="text-gradient">ML-Precision</span>
						</h2>
						<p className="mt-6 text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed text-center md:text-left px-2 md:px-0">
							We don't just list products; we analyze them. Our proprietary AI
							tools perform visual verification and neural pricing analysis to
							ensure you get the best deal, every time.
						</p>

						<div className="mt-10 space-y-6">
							{[
								{
									title: "Neural Price Guard",
									desc: "Prevents overpricing with real-time market data.",
								},
								{
									title: "Visual Artifact Check",
									desc: "Detected fake logos and hardware clones instantly.",
								},
								{
									title: "Condition Verification",
									desc: "Scans images to verify 'Like New' claims.",
								},
							].map((perk) => (
								<div
									key={perk.title}
									className="flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/5"
								>
									<div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
										<svg
											className="w-5 h-5 text-emerald-600"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<div>
										<p className="font-bold text-slate-900 dark:text-white">
											{perk.title}
										</p>
										<p className="text-sm text-slate-500 dark:text-slate-400">
											{perk.desc}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="lg:w-1/2 w-full">
						<div className="relative glass-panel !rounded-[3rem] p-4 aspect-square overflow-hidden group">
							<img
								src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000"
								alt="AI Analysis Interface"
								className="w-full h-full object-cover rounded-[2.5rem] group-hover:scale-105 transition-transform duration-1000"
							/>
							<div className="absolute inset-0 bg-brand-500/10 mix-blend-overlay"></div>
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
								<div className="w-24 h-24 rounded-full border-2 border-white/50 animate-ping absolute inset-0"></div>
								<div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl">
									<svg
										className="w-10 h-10 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<section className="section-container pb-32">
				<div className="flex flex-col gap-16">
					<div className="flex flex-col lg:flex-row items-center gap-12 mb-10">
						<div className="lg:w-1/2">
							<h2 className="section-heading text-3xl md:text-4xl text-left">
								Powerful AI Tools
							</h2>
							<p className="section-subheading mt-4 text-left">
								We've built specialized machine learning models to help you
								accurately value and identify your assets.
							</p>
							<div className="mt-8 flex flex-col gap-4">
								{[
									"Neural Price Estimation",
									"Logo Verification API",
									"Visual Component Search",
								].map((item) => (
									<div
										key={item}
										className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-semibold"
									>
										<svg
											className="w-5 h-5 text-brand-500"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
										{item}
									</div>
								))}
							</div>
						</div>
						<div className="lg:w-1/2 w-full">
							<div className="relative rounded-3xl overflow-hidden glass-panel aspect-square lg:aspect-video group">
								<img
									src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000"
									alt="AI Product Analysis"
									className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
								/>
								<div className="absolute inset-0 bg-brand-900/40 mix-blend-multiply transition-opacity group-hover:opacity-20"></div>
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center animate-pulse">
										<svg
											className="w-8 h-8 text-white"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="grid gap-8 md:grid-cols-3">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="card-light group hover:-translate-y-2"
							>
								<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white shadow-sm duration-300">
									<span className="transition-transform duration-500 group-hover:scale-110">
										{feature.icon}
									</span>
								</div>
								<h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
									{feature.title}
								</h3>
								<p className="text-slate-600 dark:text-slate-400 leading-relaxed">
									{feature.text}
								</p>
								<div className="mt-8 flex items-center text-brand-600 dark:text-brand-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
									Learn more <span className="ml-2">→</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</main>
	);
};

export default Home;
