import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
	getUserNotifications,
	markNotificationAsRead,
	deleteNotification,
	markAllNotificationsAsRead,
} from "../services/api";
import { getImageUrl } from "../utils/imageUtils";

const Notifications = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("all"); // all, unread, transaction, message
	const [selectedNotifications, setSelectedNotifications] = useState(new Set());
	const hasAutoMarkedRef = useRef(false);
	const isAutoMarkingRef = useRef(false);
	const currentUserId = user?.uid || localStorage.getItem("escrow_user_id");

	useEffect(() => {
		if (currentUserId) {
			hasAutoMarkedRef.current = false;
			fetchNotifications();
			// Auto-fetch every 1 seconds
			const interval = setInterval(fetchNotifications, 1000);
			return () => clearInterval(interval);
		}
	}, [currentUserId]);

	const fetchNotifications = async () => {
		try {
			if (!currentUserId) return;
			console.log(
				"🌐 [DEBUG-NOTIF-FETCH] Polling notifications for Identity:",
				currentUserId,
			);
			const response = await getUserNotifications(currentUserId);
			console.log("📡 [DEBUG-NOTIF-FETCH] Response from Server:", response);
			const loadedNotifications = response?.notifications || [];
			setNotifications(loadedNotifications);

			const hasUnread = loadedNotifications.some((notif) => !notif.read);
			if (hasUnread && !hasAutoMarkedRef.current && !isAutoMarkingRef.current) {
				isAutoMarkingRef.current = true;
				try {
					await markAllNotificationsAsRead(currentUserId);
					hasAutoMarkedRef.current = true;
					const refreshed = await getUserNotifications(currentUserId);
					setNotifications(refreshed?.notifications || []);
				} catch (autoMarkErr) {
					console.error(
						"Error auto-marking notifications as read:",
						autoMarkErr,
					);
				} finally {
					isAutoMarkingRef.current = false;
				}
			}
		} catch (err) {
			console.error("Error fetching notifications:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleMarkAsRead = async (notifId, escrowId, notifType) => {
		try {
			await markNotificationAsRead(notifId, currentUserId);
			fetchNotifications();
			if (escrowId) {
				navigate(`/escrow/${escrowId}`, {
					state: { messageEnabled: notifType === "PAYMENT_RECEIVED" },
				});
			}
		} catch (err) {
			console.error("Error marking as read:", err);
		}
	};

	const handleDelete = async (notifId) => {
		try {
			await deleteNotification(notifId, currentUserId);
			fetchNotifications();
		} catch (err) {
			console.error("Error deleting notification:", err);
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			for (const notif of notifications) {
				if (!notif.read) {
					await markNotificationAsRead(notif.notification_id, currentUserId);
				}
			}
			fetchNotifications();
		} catch (err) {
			console.error("Error marking all as read:", err);
		}
	};

	const getTypeColor = (type) => {
		const colors = {
			PURCHASE:
				"bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
			MESSAGE:
				"bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400",
			PAYMENT_RECEIVED:
				"bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400",
			PRODUCT_SHIPPED:
				"bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
			PAYMENT_RELEASED:
				"bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
			DISPUTE: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
		};
		return (
			colors[type] ||
			"bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400"
		);
	};

	const getTypeIcon = (type) => {
		const icons = {
			PURCHASE: "🛒",
			MESSAGE: "💬",
			PAYMENT_RECEIVED: "💳",
			PRODUCT_SHIPPED: "📦",
			PAYMENT_RELEASED: "✅",
			DISPUTE: "⚠️",
		};
		return icons[type] || "📢";
	};

	const formatDate = (timestamp) => {
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffSeconds = Math.floor((now - date) / 1000);

		if (diffSeconds < 60) return "Just now";
		if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
		if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
		if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

		return date.toLocaleDateString();
	};

	const filteredNotifications = notifications.filter((n) => {
		if (filter === "unread") return !n.read;
		if (filter === "transaction")
			return [
				"PURCHASE",
				"PAYMENT_RECEIVED",
				"PRODUCT_SHIPPED",
				"PAYMENT_RELEASED",
				"DISPUTE",
			].includes(n.type);
		if (filter === "message") return n.type === "MESSAGE";
		return true;
	});

	const unreadCount = notifications.filter((n) => !n.read).length;

	if (loading) {
		return (
			<div className="section-container mt-12 mb-12">
				<div className="max-w-4xl mx-auto">
					<div className="glass-panel p-12 text-center">
						<div className="inline-block mb-4">
							<div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-brand-500 rounded-full animate-spin"></div>
						</div>
						<p className="text-slate-600 dark:text-slate-400">
							Loading notifications...
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="section-container mt-6 sm:mt-12 mb-12 px-4 sm:px-6">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<button
							onClick={() => navigate(-1)}
							className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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
					</div>
					<h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white mb-2">
						<span className="text-gradient">Notifications</span>
					</h1>
					<p className="text-slate-600 dark:text-slate-400">
						Manage your transaction alerts and messages
					</p>
				</div>

				{/* Filter & Actions */}
				<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
					<div className="flex gap-2 flex-wrap">
						{["all", "unread", "transaction", "message"].map((f) => (
							<button
								key={f}
								onClick={() => setFilter(f)}
								className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
									filter === f
										? "bg-brand-500 text-white"
										: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
								}`}
							>
								{f.charAt(0).toUpperCase() + f.slice(1)}
							</button>
						))}
					</div>
					{unreadCount > 0 && (
						<button
							onClick={handleMarkAllAsRead}
							className="ml-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
						>
							Mark all as read
						</button>
					)}
				</div>

				{/* Unread Count Badge */}
				{unreadCount > 0 && (
					<div className="mb-6 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 rounded-lg">
						<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
							{unreadCount}
						</span>
						<p className="text-sm text-blue-700 dark:text-blue-400">
							You have {unreadCount} unread notification
							{unreadCount !== 1 ? "s" : ""}
						</p>
					</div>
				)}

				{/* Notifications List */}
				{filteredNotifications.length === 0 ? (
					<div className="glass-panel p-12 text-center">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
							<svg
								className="w-8 h-8 text-slate-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
								/>
							</svg>
						</div>
						<h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
							No {filter !== "all" ? filter : "new"} notifications
						</h3>
						<p className="text-slate-600 dark:text-slate-400">
							You're all caught up! Check back soon for updates.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filteredNotifications.map((notif) => (
							<div
								key={notif.notification_id}
								className={`glass-panel p-4 cursor-pointer transition-all hover:shadow-lg ${
									!notif.read
										? "bg-brand-50 dark:bg-brand-500/5 border-l-4 border-l-brand-500"
										: ""
								}`}
								onClick={() =>
									notif.related_escrow_id &&
									handleMarkAsRead(
										notif.notification_id,
										notif.related_escrow_id,
										notif.type,
									)
								}
							>
								<div className="flex items-start gap-4">
									{/* Icon */}
									<div
										className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${getTypeColor(notif.type)}`}
									>
										{getTypeIcon(notif.type)}
									</div>

									{/* Product thumbnail (if available) */}
									{(() => {
										const thumbSrc = getImageUrl(
											notif.related_product_image_url ||
												notif.product_image_url ||
												notif.related_product_image ||
												notif.product_image,
										);
										if (!thumbSrc) return null;
										return (
											<img
												src={thumbSrc}
												alt="Product"
												className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-white/10"
												loading="lazy"
											/>
										);
									})()}

									{/* Content */}
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2">
											<div>
												<h3
													className={`font-bold truncate ${notif.read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}
												>
													{notif.title}
												</h3>
												<p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
													{notif.message}
												</p>
											</div>
											{!notif.read && (
												<div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-2"></div>
											)}
										</div>
										<p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
											{formatDate(notif.created_at)}
										</p>
									</div>

									{/* Actions */}
									<div className="flex gap-1 flex-shrink-0">
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(notif.notification_id);
											}}
											className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
											title="Delete"
										>
											<svg
												className="w-4 h-4 text-slate-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default Notifications;
