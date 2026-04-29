import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { getUnreadNotificationCount } from "../../services/api";

const coreLinks = [
	{
		to: "/",
		label: "Home",
		icon: (
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
					d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
				/>
			</svg>
		),
	},
	{
		to: "/browse",
		label: "Marketplace",
		icon: (
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
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		),
	},
	{
		to: "/sell",
		label: "Sell Items",
		icon: (
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
					d="M12 4v16m8-8H4"
				/>
			</svg>
		),
	},
];

const aiTools = [
	{
		to: "/price-predictor",
		label: "Price Estimator",
		desc: "AI valuation for second-hand items",
		icon: (
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
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
		),
	},
	{
		to: "/image-search",
		label: "Visual Search",
		desc: "Find items with AI vision",
		icon: (
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
		to: "/logo-verifier",
		label: "Brand Authenticator",
		desc: "Verify logos with ML",
		icon: (
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
					d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
				/>
			</svg>
		),
	},
];

const Navbar = () => {
	const { theme, toggleTheme } = useTheme();
	const { user } = useAuth();
	const [isToolsOpen, setIsToolsOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [unreadNotifications, setUnreadNotifications] = useState(0);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsToolsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		let isFetching = false;
		const currentUserId = user?.uid || localStorage.getItem("escrow_user_id");
		const fetchUnreadCount = async () => {
			if (!currentUserId || isFetching) return;
			isFetching = true;
			try {
				const response = await getUnreadNotificationCount(currentUserId);
				setUnreadNotifications(response?.unread_count || 0);
			} catch (error) {
				console.error("Error fetching unread notifications:", error);
			} finally {
				isFetching = false;
			}
		};

		fetchUnreadCount();

		// Active frequent polling
		const interval = setInterval(fetchUnreadCount, 5000);

		// Instant cross-tab/viewport visibility sync
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") fetchUnreadCount();
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [user]);

	return (
		<header
			className="sticky top-0 z-50 transition-all duration-300
      bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl 
      border-b border-slate-200 dark:border-white/5"
		>
			<nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3">
				{/* Logo Section */}
				<Link
					to="/"
					className="group flex items-center gap-2 sm:gap-3.5 flex-shrink-0 z-50"
				>
					<div
						className="relative flex h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 items-center justify-center rounded-lg sm:rounded-xl 
            bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand-500/20
            transition-all duration-300 group-hover:rotate-6 group-hover:scale-110"
					>
						<div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
						ML
					</div>

					<div className="flex flex-col">
						<span className="font-display text-sm sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
							TradeSmart
						</span>
						<span className="text-[7px] sm:text-[9px] lg:text-[10px] font-bold tracking-[0.3em] text-brand-600 dark:text-brand-400 mt-0.5">
							v2.0 HUB
						</span>
					</div>
				</Link>

				{/* Desktop Central Navigation */}
				<div className="hidden items-center gap-0.5 sm:gap-1 lg:gap-2 md:flex">
					{coreLinks.map((link) => (
						<NavLink
							key={link.to}
							to={link.to}
							className={({ isActive }) =>
								[
									"rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 flex items-center gap-2",
									isActive
										? "text-brand-600 dark:text-brand-400 bg-brand-500/10 border border-brand-500/20 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5",
								].join(" ")
							}
						>
							{link.icon}
							{link.label}
						</NavLink>
					))}

					{/* AI Tools Dropdown */}
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsToolsOpen(!isToolsOpen)}
							className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
								isToolsOpen
									? "bg-slate-100 dark:bg-white/5 text-brand-600 dark:text-brand-400"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
							}`}
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
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							AI Intelligence
							<svg
								className={`ml-1 w-3 h-3 transition-transform duration-300 ${isToolsOpen ? "rotate-180" : ""}`}
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

						{isToolsOpen && (
							<div className="absolute top-full left-0 mt-2 w-72 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-white/10 p-2 animate-slide-up overflow-hidden">
								<div className="p-3 mb-2 bg-brand-500/5 rounded-2xl border border-brand-500/10">
									<p className="text-[10px] font-black tracking-widest text-brand-600 uppercase">
										Proprietary ML Models
									</p>
								</div>
								{aiTools.map((tool) => (
									<Link
										key={tool.to}
										to={tool.to}
										className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 group transition-all"
									>
										<div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
											{tool.icon}
										</div>
										<div>
											<p className="text-sm font-bold text-slate-900 dark:text-white">
												{tool.label}
											</p>
											<p className="text-[10px] text-slate-500 dark:text-white/40 mt-1">
												{tool.desc}
											</p>
										</div>
									</Link>
								))}
							</div>
						)}
					</div>

					<NavLink
						to="/wishlist"
						className={({ isActive }) =>
							[
								"rounded-full px-5 py-2 text-sm font-bold transition-all duration-300 flex items-center gap-2",
								isActive
									? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5",
							].join(" ")
						}
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
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/>
						</svg>
						Wishlist
					</NavLink>
				</div>

				{user && (
					<NavLink
						to="/notifications"
						className={({ isActive }) =>
							[
								"rounded-full w-9 h-9 sm:w-10 sm:h-10 transition-all duration-300 flex items-center justify-center relative group text-slate-500 dark:text-slate-400 hover:text-white",
								isActive
									? "text-brand-600 dark:text-brand-400 bg-brand-500/10 border border-brand-500/20 shadow-sm"
									: "bg-slate-100 dark:bg-white/5 hover:bg-brand-500 dark:hover:bg-brand-500",
							].join(" ")
						}
					>
						<svg
							className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/>
						</svg>
						{unreadNotifications > 0 && (
							<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center border-2 border-white dark:border-slate-950">
								{unreadNotifications > 99 ? "99+" : unreadNotifications}
							</span>
						)}
						{/* Notifications */}
					</NavLink>
				)}
				{/* Right side - Theme Toggle, Mobile Burger & Profile */}
				<div className="flex items-center gap-2 sm:gap-4">
					<button
						onClick={toggleTheme}
						className="hidden lg:inline-flex rounded-full w-9 h-9 sm:w-10 sm:h-10 transition-all duration-300
              bg-slate-100 dark:bg-white/5 hover:bg-brand-500 dark:hover:bg-brand-500 
              items-center justify-center group text-slate-500 dark:text-slate-400 hover:text-white"
					>
						{theme === "dark" ? (
							<svg
								className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-45 transition-transform"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0A9 9 0 115.636 5.636a9 9 0 0112.728 12.728z"
								/>
							</svg>
						) : (
							<svg
								className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-rotate-12 transition-transform"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
								/>
							</svg>
						)}
					</button>

					<NavLink
						to="/wishlist"
						className={({ isActive }) =>
							[
								"lg:hidden p-2.5 rounded-xl border transition-all",
								isActive
									? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
									: "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10",
							].join(" ")
						}
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
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/>
						</svg>
					</NavLink>

					<Link
						to={user ? "/profile" : "/signin"}
						className="lg:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
					>
						{user ? (
							<img
								src={user.profilePic}
								alt="Profile"
								className="w-6 h-6 rounded-full object-cover"
							/>
						) : (
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
									d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m8-10a4 4 0 110-8 4 4 0 010 8zm6 2a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						)}
					</Link>

					{user ? (
						<div className="hidden lg:flex">
							<Link
								to="/profile"
								className="flex items-center gap-3 p-1 pl-4 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-brand-500/50 transition-all group"
							>
								<span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white/60 group-hover:text-brand-600 transition-colors">
									{user.username}
								</span>
								<img
									src={user.profilePic}
									className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md transition-transform group-hover:scale-110"
									alt="Profile"
								/>
							</Link>
						</div>
					) : (
						<div className="hidden lg:flex items-center gap-2">
							<Link
								to="/signin"
								className="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-brand-600 transition-colors"
							>
								Sign In
							</Link>
							<Link
								to="/signup"
								className="btn-gradient !py-2.5 !px-6 !text-xs !rounded-full !font-black uppercase tracking-widest shadow-lg shadow-brand-500/20"
							>
								Join Network
							</Link>
						</div>
					)}

					{/* Mobile Menu Toggle - Meatballs Menu (3 Dots) */}
					<button
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						className="lg:hidden z-50 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 active:scale-90 transition-all shadow-sm"
					>
						{isMobileMenuOpen ? (
							<svg
								className="w-6 h-6 animate-in fade-in zoom-in duration-300 text-brand-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2.5"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						) : (
							<svg
								className="w-6 h-6 animate-in fade-in zoom-in duration-300"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
							</svg>
						)}
					</button>
				</div>
			</nav>

			{/* Mobile Slide Drawer */}
			{isMobileMenuOpen && (
				<div className="lg:hidden fixed inset-0 z-50 flex min-h-screen">
					<div
						className="absolute inset-0 bg-slate-900/40 backdrop-blur-lg"
						onClick={() => setIsMobileMenuOpen(false)}
					></div>
					<aside className="relative z-50 w-[75%] max-w-[75vw] min-h-screen bg-white dark:bg-slate-950 shadow-2xl border-r border-slate-200/80 dark:border-white/10 p-6 overflow-y-auto animate-in slide-in-from-left duration-300">
						<div className="flex items-center justify-between mb-8">
							<div>
								<h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
									Menu
								</h3>
								<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
									All features in one place
								</p>
							</div>
							<button
								onClick={() => setIsMobileMenuOpen(false)}
								className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
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
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div className="space-y-2">
							{coreLinks
								.concat(
									[
										{
											to: "/wishlist",
											label: "Wishlist",
											icon: (
												<svg
													className="w-5 h-5 text-rose-500"
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
											),
										},
										user
											? {
													to: "/notifications",
													label: "Notifications",
													icon: (
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
																d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
															/>
														</svg>
													),
												}
											: null,
									].filter(Boolean),
								)
								.map((link) => (
									<NavLink
										key={link.to}
										to={link.to}
										onClick={() => setIsMobileMenuOpen(false)}
										className={({ isActive }) =>
											[
												"flex items-center gap-3 p-3 rounded-3xl transition-all text-sm font-bold",
												isActive
													? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
													: "bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10",
											].join(" ")
										}
									>
										<div className="w-8 h-8 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center relative">
											{link.icon}
											{link.to === "/notifications" &&
												unreadNotifications > 0 && (
													<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
														{unreadNotifications > 9
															? "9+"
															: unreadNotifications}
													</span>
												)}
										</div>
										{link.label}
									</NavLink>
								))}
						</div>

						<div className="mt-6">
							<p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-4">
								AI Tools
							</p>
							<div className="space-y-2.5">
								{aiTools.map((tool) => (
									<Link
										key={tool.to}
										to={tool.to}
										onClick={() => setIsMobileMenuOpen(false)}
										className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-brand-500/50 transition-all"
									>
										<div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-brand-600">
											{tool.icon}
										</div>
										<div>
											<p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
												{tool.label}
											</p>
											<p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
												{tool.desc}
											</p>
										</div>
									</Link>
								))}
							</div>
						</div>

						<div className="mt-6 space-y-2.5">
							{user ? (
								<Link
									to="/profile"
									onClick={() => setIsMobileMenuOpen(false)}
									className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl"
								>
									<img
										src={user.profilePic}
										alt="Profile"
										className="w-9 h-9 rounded-2xl border-2 border-white/20 dark:border-slate-200"
									/>
									<div>
										<p className="font-black uppercase tracking-widest">
											{user.username}
										</p>
										<p className="text-[11px] text-slate-300 uppercase tracking-[0.2em]">
											Manage Profile
										</p>
									</div>
								</Link>
							) : (
								<div className="grid grid-cols-2 gap-3">
									<Link
										to="/signin"
										onClick={() => setIsMobileMenuOpen(false)}
										className="py-3 text-center rounded-2xl bg-slate-100 dark:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white"
									>
										Sign In
									</Link>
									<Link
										to="/signup"
										onClick={() => setIsMobileMenuOpen(false)}
										className="py-3 text-center rounded-2xl bg-brand-600 text-white text-xs font-black uppercase tracking-widest"
									>
										Register
									</Link>
								</div>
							)}
						</div>
					</aside>
				</div>
			)}
		</header>
	);
};

export default Navbar;
