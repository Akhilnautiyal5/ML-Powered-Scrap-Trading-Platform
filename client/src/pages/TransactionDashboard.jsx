import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
	getEscrowDetails,
	getProduct,
	createOrGetMessageThread,
	getMessageThread,
	sendMessage,
	markThreadRead,
	linkEscrowToThread,
	processEscrowAction,
	reportDispute,
	confirmReturn,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
	EscrowStatusBadge,
	EscrowProgressTracker,
	EscrowActionPanel,
	EscrowAuditLog,
} from "../components/escrow/EscrowComponents";
import { formatPrice } from "../utils/formatPrice";

/**
 * CountdownTimer: Helper for ticking seconds
 */
const CountdownTimer = ({ targetUnixTime, onExpire }) => {
	const [timeLeft, setTimeLeft] = useState("");
	const hasExpiredRef = React.useRef(false);

	useEffect(() => {
		if (!targetUnixTime) return;
		hasExpiredRef.current = false;

		const updateTimer = () => {
			const now = Math.floor(Date.now() / 1000);
			const diff = targetUnixTime - now;

			if (diff <= 0) {
				setTimeLeft("Time Expired! Auto-Release Initiating...");
				if (!hasExpiredRef.current) {
					hasExpiredRef.current = true;
					onExpire?.();
				}
			} else {
				const days = Math.floor(diff / 86400);
				const hours = Math.floor((diff % 86400) / 3600);
				const minutes = Math.floor((diff % 3600) / 60);
				const seconds = diff % 60;
				let str = "";
				if (days > 0) str += `${days}d `;
				if (hours > 0 || days > 0) str += `${hours}h `;
				if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}m `;
				str += `${seconds}s`;
				setTimeLeft(str);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [targetUnixTime]);

	return <span>{timeLeft}</span>;
};

/**
 * TransactionDashboard: Main Secure Escrow Portal for individual orders.
 */
const TransactionDashboard = () => {
	const { escrowId } = useParams();
	const { user } = useAuth();
	const [escrow, setEscrow] = useState(null);
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState("");
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const [showMessageingInfo, setShowMessageingInfo] = useState(false);
	const [threadId, setThreadId] = useState(null);

	// Dispute/termination workflow
	const [showDisputeModal, setShowDisputeModal] = useState(false);
	const [disputeOption, setDisputeOption] = useState("");
	const [disputeReason, setDisputeReason] = useState("");
	const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
	const [disputeSubmitError, setDisputeSubmitError] = useState(null);

	const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);
	const [confirmReturnError, setConfirmReturnError] = useState(null);

	// Get current user ID prioritizing auth context over legacy localStorage overrides unless explicitly in demo mode
	const currentUserId =
		user?.uid || localStorage.getItem("escrow_user_id") || "demo_buyer";
	const currentUserRole = localStorage.getItem("escrow_user_role") || "BUYER";

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 10000); // Polling for updates
		return () => clearInterval(interval);
	}, [escrowId]);

	const handleSendMessage = async () => {
		if (!newMessage.trim() || !threadId) return;

		setIsSendingMessage(true);
		try {
			// Send message via API
			const res = await sendMessage(threadId, currentUserId, newMessage);
			if (res.success) {
				// Add message to local state
				const message = {
					id: res.message.id,
					sender_id: currentUserId,
					sender_role: currentUserRole,
					content: newMessage,
					timestamp: new Date(res.message.timestamp).toLocaleTimeString(),
					read: false,
				};
				setMessages([...messages, message]);
				setNewMessage("");
			}
		} catch (err) {
			console.error("Error sending message:", err);
			// Fallback to local state if API fails
			const message = {
				id: `msg_${Date.now()}`,
				sender_id: currentUserId,
				sender_role: currentUserRole,
				text: newMessage,
				timestamp: new Date().toLocaleTimeString(),
				read: false,
			};
			setMessages([...messages, message]);
			setNewMessage("");
		} finally {
			setIsSendingMessage(false);
		}
	};

	const handleSubmitDispute = async () => {
		if (!escrow?.escrow_id) return;
		if (!disputeOption) return;
		if (!disputeReason.trim()) {
			setDisputeSubmitError("Please enter a reason.");
			return;
		}

		setIsSubmittingDispute(true);
		setDisputeSubmitError(null);
		try {
			const res = await reportDispute({
				escrow_id: escrow.escrow_id,
				option: disputeOption,
				reason: disputeReason.trim(),
			});
			if (res?.success) {
				setShowDisputeModal(false);
				setDisputeReason("");
				await fetchData();
			}
		} catch (err) {
			setDisputeSubmitError(err.message || "Failed to submit report");
		} finally {
			setIsSubmittingDispute(false);
		}
	};

	const handleConfirmReturn = async () => {
		if (!escrow?.escrow_id) return;
		setIsConfirmingReturn(true);
		setConfirmReturnError(null);
		try {
			const res = await confirmReturn({ escrow_id: escrow.escrow_id });
			if (res?.success) {
				await fetchData();
			}
		} catch (err) {
			setConfirmReturnError(err.message || "Failed to confirm return");
		} finally {
			setIsConfirmingReturn(false);
		}
	};

	const fetchData = async () => {
		try {
			const res = await getEscrowDetails(escrowId);
			if (res.success) {
				setEscrow(res.escrow);

				// Default dispute option based on current escrow state.
				if (!showDisputeModal) {
					const st = String(
						res.escrow?.status_matrix?.escrow_status || "",
					).toUpperCase();
					if (st === "DELIVERED") setDisputeOption("RETURN");
					else if (st === "FUNDED" || st === "SHIPPED")
						setDisputeOption("CANCEL");
					else setDisputeOption("");
				}

				if (
					res.escrow.status_matrix.escrow_status !== "PENDING_PAYMENT" ||
					String(
						res.escrow.status_matrix.payment_status || "",
					).toUpperCase() !== "PENDING"
				) {
					setShowMessageingInfo(true);
				}

				// Create or get message thread
				try {
					const threadRes = await createOrGetMessageThread(
						res.escrow.product_id,
						res.escrow.buyer_id,
						res.escrow.seller_id,
					);
					if (threadRes.success && threadRes.thread) {
						const tid = threadRes.thread.id;
						setThreadId(tid);

						// Link escrow to thread if not already linked
						if (!threadRes.thread.escrow_id) {
							await linkEscrowToThread(tid, escrowId);
						}

						// Fetch messages from thread
						const msgRes = await getMessageThread(tid);
						if (msgRes.success && msgRes.thread.messages) {
							// Convert messages format for display
							const formattedMessages = msgRes.thread.messages.map((msg) => ({
								id: msg.id,
								sender_id: msg.sender_id,
								sender_role: msg.sender_role || "buyer",
								text: msg.content || "",
								timestamp: new Date(msg.timestamp).toLocaleTimeString(),
								read: msg.read || false,
								is_system: msg.is_system || false,
							}));
							setMessages(formattedMessages);
						}

						// Mark thread as read
						await markThreadRead(tid, currentUserId);
					}
				} catch (threadErr) {
					console.error("Error managing message thread:", threadErr);
				}

				// Load product info
				const prodRes = await getProduct(res.escrow.product_id);
				if (prodRes.success) setProduct(prodRes.product);
			}
		} catch (err) {
			console.error("Error fetching escrow details:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
				<div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
			</div>
		);

	if (!escrow) return null;

	if (error)
		return (
			<div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center">
				<h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
					Unable to Load Ledger
				</h2>
				<p className="text-slate-500 mb-8">{error}</p>
				<Link to="/my-orders" className="btn-secondary">
					View My Active Orders
				</Link>
			</div>
		);

	const escrowStatus = String(
		escrow?.status_matrix?.escrow_status || "",
	).toUpperCase();
	const disputeKind = String(escrow?.dispute?.kind || "").toUpperCase();
	const isBuyer = String(escrow?.buyer_id || "") === String(currentUserId);
	const isSeller = String(escrow?.seller_id || "") === String(currentUserId);

	const canBuyerCancel =
		isBuyer && (escrowStatus === "FUNDED" || escrowStatus === "SHIPPED");
	const canBuyerReturn = isBuyer && escrowStatus === "DELIVERED";
	const canBuyerReport =
		isBuyer &&
		escrowStatus !== "DISPUTED" &&
		escrowStatus !== "REFUNDED" &&
		escrowStatus !== "RELEASED" &&
		escrowStatus !== "CANCELLED" &&
		(canBuyerCancel || canBuyerReturn);

	const canSellerConfirmReturn =
		isSeller &&
		escrowStatus === "DISPUTED" &&
		disputeKind === "RETURN" &&
		escrow?.dispute?.return_confirmed !== true;

	return (
		<div className="min-h-screen pt-4 pb-16 px-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
			<div className="section-container">
				{/* Back Button */}
				<div className="mb-6">
					<Link
						to={`/product/${product?.id || product?._id || escrow?.product_id}`}
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
						Back
					</Link>
				</div>
			</div>
			<div className="max-w-5xl mx-auto mt-0 animate-fade-in">
				{/* Header: Core Details & Status */}
				<div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white dark:bg-slate-900/50 p-10 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] pointer-events-none -z-10 rounded-full -mt-20 -mr-20"></div>

					<div className="space-y-4 max-w-2xl">
						<div className="flex items-center gap-3">
							<span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-600 dark:text-brand-400">
								Secure Protocol ID:
							</span>
							<kbd className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded font-mono text-xs text-slate-400">
								{escrow.escrow_id}
							</kbd>
							<EscrowStatusBadge status={escrow.status_matrix.escrow_status} />
						</div>
						<h1 className="text-4xl font-display font-bold text-slate-900 dark:text-white">
							{product?.title || "Asset Transaction"}
						</h1>
						<p className="text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
							This transaction is being mediated by an automated Escrow Smart
							Agent. Funds are secured until delivery is confirmed by the buyer.
						</p>
					</div>

					<div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-100 dark:border-white/5 text-right space-y-2 min-w-[220px]">
						<p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
							Value Held in Escrow
						</p>
						<p className="text-4xl font-display font-bold text-slate-900 dark:text-white">
							{formatPrice(escrow.ledger.amount)}
						</p>
						<div className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
							{escrow.status_matrix.payment_status}
						</div>
					</div>
				</div>

				{/* Transaction Map: Progress Tracker */}
				<div className="glass-panel mt-10 p-10 space-y-12">
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6 mb-10">
						<h3 className="text-xl font-bold text-slate-900 dark:text-white">
							Escrow Progression Protocol
						</h3>
						<div className="text-[10px] font-bold text-slate-400 uppercase">
							Step-by-Step Immutability
						</div>
					</div>
					<EscrowProgressTracker
						currentStatus={escrow.status_matrix.escrow_status}
					/>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					{/* Main Action Control Panel */}
					<div className="lg:col-span-12 xl:col-span-8 space-y-8">
						<div className="glass-panel p-10 bg-brand-500/5 dark:bg-brand-500/10 border-brand-500/10 space-y-8">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
									<svg
										className="w-6 h-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2.5"
											d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008.93 11V7a5 5 0 00-10 0v4a13.916 13.916 0 001.069 5.378M12 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09A13.916 13.916 0 0115.07 11V7a5 5 0 0110 0v4a13.916 13.916 0 01-1.069 5.378"
										/>
									</svg>
								</div>
								<div>
									<h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
										Identity Confirmation
									</h3>
									<p className="text-xs text-slate-500 mt-0.5">
										Performing action as{" "}
										<span className="font-bold text-brand-500 italic uppercase underline decoration-brand-500/30">
											{currentUserId}
										</span>
									</p>
								</div>
							</div>

							<div className="p-1 border border-slate-200 dark:border-white/5 rounded-2xl">
								<div className="bg-white dark:bg-slate-900/80 p-8 rounded-[14px]">
									<EscrowActionPanel
										escrow={escrow}
										userId={currentUserId}
										userRole={currentUserRole}
										onUpdate={fetchData}
									/>
								</div>
							</div>

							{/* Lock Indicator */}
							{escrow.ledger.is_locked && (
								<div className="flex items-center gap-4 p-4 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-xl border border-red-500/10">
									<svg
										className="w-5 h-5 animate-pulse"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										/>
									</svg>
									<p className="text-sm font-bold uppercase tracking-widest">
										Protocol Lockdown: Automated Resolution Active
									</p>
								</div>
							)}

							{/* Dispute / Termination */}
							{(canBuyerReport ||
								escrowStatus === "DISPUTED" ||
								canSellerConfirmReturn) && (
								<div className="p-6 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-white/10">
									<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
										<div className="space-y-1">
											<p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
												Dispute / Termination
											</p>
											<p className="text-sm text-slate-700 dark:text-slate-300">
												{escrowStatus === "DISPUTED"
													? "This transaction is currently disputed. Funds are on hold."
													: "Report an issue to cancel (before delivery) or request return (after delivery)."}
											</p>
										</div>

										<div className="flex items-center gap-3 justify-end">
											{canBuyerReport && (
												<button
													onClick={() => {
														setDisputeSubmitError(null);
														setShowDisputeModal(true);
													}}
													className="btn-secondary !py-2 !px-4"
												>
													Report
												</button>
											)}

											{canSellerConfirmReturn && (
												<button
													onClick={handleConfirmReturn}
													disabled={isConfirmingReturn}
													className="btn-primary !py-2 !px-4"
												>
													{isConfirmingReturn
														? "Confirming..."
														: "Product Retrieved"}
												</button>
											)}
										</div>
									</div>

									{confirmReturnError && (
										<p className="mt-3 text-sm text-red-600 dark:text-red-400">
											{confirmReturnError}
										</p>
									)}

									{escrowStatus === "DISPUTED" && (
										<div className="mt-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
											<p>
												<span className="font-semibold">Type:</span>{" "}
												{disputeKind || "DISPUTED"}
											</p>
											{escrow?.dispute?.reason && (
												<p>
													<span className="font-semibold">Reason:</span>{" "}
													{escrow.dispute.reason}
												</p>
											)}
											{escrow?.deadlines?.refund_expected_by > 0 && (
												<p>
													<span className="font-semibold">
														Refund expected by:
													</span>{" "}
													{new Date(
														escrow.deadlines.refund_expected_by * 1000,
													).toLocaleDateString()}
												</p>
											)}
										</div>
									)}
								</div>
							)}

							{/* Auto-Release Timer Indicator */}
							{escrow.status_matrix.escrow_status === "DELIVERED" &&
								escrow.deadlines?.auto_release_at > 0 && (
									<div className="flex items-center gap-4 p-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 text-orange-700 dark:text-orange-400 rounded-xl border border-orange-500/20 shadow-inner">
										<svg
											className="w-8 h-8 opacity-80"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<div>
											<p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">
												Inspection Deadline Countdown
											</p>
											<p className="text-xl font-mono font-bold tracking-widest text-slate-900 dark:text-white">
												<CountdownTimer
													targetUnixTime={escrow.deadlines.auto_release_at}
													onExpire={async () => {
														try {
															// Execute via pre-configured Axios API with Buyer credentials to avoid Vite Proxy 404s
															await processEscrowAction({
																escrow_id: escrow.escrow_id,
																target_state: "RELEASED",
																user_id: currentUserId,
																role: currentUserRole,
																reason: "Auto-release: Inspection period ended",
															});

															// Soft-poll the ledger to natively update the UI without reloading
															setTimeout(fetchData, 800);
														} catch (error) {
															console.error("Auto-release failed", error);
														}
													}}
												/>
											</p>
											<p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
												Funds will automatically transfer if buyer does not
												decide.
											</p>
										</div>
									</div>
								)}
						</div>

						{/* Messaging Section - Enable when Payment is Complete */}
						{(escrow.status_matrix.escrow_status !== "PENDING_PAYMENT" ||
							String(
								escrow.status_matrix.payment_status || "",
							).toUpperCase() !== "PENDING") && (
							<div className="glass-panel p-8 space-y-6">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
											<svg
												className="w-5 h-5 text-brand-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
												/>
											</svg>
											Direct Messaging
										</h3>
										<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
											Communicate with the{" "}
											{currentUserRole === "BUYER" ? "seller" : "buyer"} about
											this transaction
										</p>
									</div>
									<button
										onClick={() => setShowMessageingInfo(!showMessageingInfo)}
										className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
									>
										<svg
											className="w-5 h-5 text-slate-600 dark:text-slate-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</button>
								</div>

								{/* Messages Display */}
								<div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 h-64 overflow-y-auto space-y-3 border border-slate-200 dark:border-white/5">
									{messages.length === 0 ? (
										<div className="h-full flex items-center justify-center text-slate-400 text-center">
											<div>
												<svg
													className="w-12 h-12 mx-auto mb-3 opacity-50"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="1.5"
														d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
													/>
												</svg>
												<p className="text-sm">
													No messages yet. Start the conversation!
												</p>
											</div>
										</div>
									) : (
										messages.map((msg) => (
											<div
												key={msg.id}
												className={`flex ${
													msg.sender_id === currentUserId
														? "justify-end"
														: "justify-start"
												}`}
											>
												<div
													className={`max-w-xs px-4 py-2 rounded-lg ${
														msg.sender_id === currentUserId
															? "bg-brand-500 text-white"
															: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
													} ${msg.is_system ? "mx-auto bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400" : ""}`}
												>
													<p className="text-sm">{msg.text || msg.content}</p>
													<p
														className={`text-[10px] mt-1 ${
															msg.sender_id === currentUserId
																? "text-white/70"
																: "text-slate-500 dark:text-slate-400"
														}`}
													>
														{msg.timestamp}
													</p>
												</div>
											</div>
										))
									)}
								</div>

								{/* Message Input */}
								<div className="flex gap-2">
									<input
										type="text"
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
										placeholder="Type a message..."
										className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
									/>
									<button
										onClick={handleSendMessage}
										disabled={isSendingMessage || !newMessage.trim()}
										className="px-6 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
									>
										Send
									</button>
								</div>

								{showMessageingInfo && (
									<div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
										<p className="text-sm text-blue-800 dark:text-blue-300">
											<strong>💬 Messaging Enabled:</strong> You can now
											communicate directly with the{" "}
											{currentUserRole === "BUYER" ? "seller" : "buyer"}. Use
											this channel to coordinate shipment details, answer
											questions, or resolve any concerns.
										</p>
									</div>
								)}
							</div>
						)}

						{/* Payment Pending Badge */}
						{escrow.status_matrix.escrow_status === "PENDING_PAYMENT" && (
							<div className="glass-panel p-8 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
								<div className="text-4xl mb-3">⏳</div>
								<h3 className="text-lg font-bold text-amber-900 dark:text-amber-400 mb-2">
									Awaiting Payment
								</h3>
								<p className="text-amber-800 dark:text-amber-300 text-sm">
									Messaging will be enabled after payment is confirmed. Proceed
									to payment to unlock direct communication with the buyer.
								</p>
							</div>
						)}
					</div>

					{/* Audit Logs Sidebar */}
					<div className="lg:col-span-12 xl:col-span-4 space-y-8">
						<div className="glass-panel p-10 h-full max-h-[600px] flex flex-col">
							<EscrowAuditLog logs={escrow.audit_trail} />
							<div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
								<h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
									Security Parameters
								</h4>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-1">
										<p className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold">
											Lock Mechanism
										</p>
										<p className="text-[10px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
											{escrow.ledger.is_locked ? (
												<span className="text-red-500">ENGAGED</span>
											) : (
												<span className="text-emerald-500">ARMED</span>
											)}
										</p>
									</div>
									<div className="space-y-1">
										<p className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold">
											Protocol Integrity
										</p>
										<p className="text-[10px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
											<span className="text-emerald-500">Verified</span>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Action Controls for Demo (Switcher) */}
				<div className="fixed bottom-8 right-8 z-50 glass-panel p-4 shadow-2xl space-y-4 border-brand-500 flex flex-col items-center">
					<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-500 mb-2">
						Simulate Authority
					</p>
					<div className="flex gap-2">
						<button
							onClick={() => {
								localStorage.setItem("escrow_user_id", "demo_buyer");
								localStorage.setItem("escrow_user_role", "BUYER");
								window.location.reload();
							}}
							className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-all duration-300 ${currentUserId === "demo_buyer" ? "bg-brand-500 text-white border-brand-500 scale-105 shadow-md shadow-brand-500/20" : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100"}`}
						>
							Actor: Buyer
						</button>
						<button
							onClick={() => {
								localStorage.setItem("escrow_user_id", "demo_seller");
								localStorage.setItem("escrow_user_role", "SELLER");
								window.location.reload();
							}}
							className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-all duration-300 ${currentUserId === "demo_seller" ? "bg-brand-500 text-white border-brand-500 scale-105 shadow-md shadow-brand-500/20" : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100"}`}
						>
							Actor: Seller
						</button>
					</div>
				</div>

				{/* Dispute modal */}
				{showDisputeModal && (
					<div
						className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
						onClick={() => {
							if (!isSubmittingDispute) setShowDisputeModal(false);
						}}
					>
						<div
							className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-900 dark:border-white/10 shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-bold text-slate-900 dark:text-white">
								Report Transaction
							</h3>
							<p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
								Choose{" "}
								{canBuyerReturn
									? "RETURN (after delivery)"
									: "CANCEL (before delivery)"}{" "}
								and add a short reason.
							</p>

							<div className="mt-5 space-y-4">
								<div>
									<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
										Option
									</label>
									<select
										value={disputeOption}
										onChange={(e) => setDisputeOption(e.target.value)}
										className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
									>
										{canBuyerCancel && (
											<option value="CANCEL">CANCEL (before delivery)</option>
										)}
										{canBuyerReturn && (
											<option value="RETURN">RETURN (after delivery)</option>
										)}
									</select>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
										Reason
									</label>
									<textarea
										rows={4}
										value={disputeReason}
										onChange={(e) => setDisputeReason(e.target.value)}
										placeholder="Write your reason..."
										className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
									/>
								</div>

								{disputeSubmitError && (
									<p className="text-sm text-red-600 dark:text-red-400">
										{disputeSubmitError}
									</p>
								)}
							</div>

							<div className="mt-6 flex justify-end gap-2 ">
								<button
									onClick={() => setShowDisputeModal(false)}
									disabled={isSubmittingDispute}
									className="btn-secondary !py-2 !px-4 font-semibold text-black dark:text-white hover:text-black dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl p-6 border border-slate-300 dark:border-white/10"
								>
									Close
								</button>
								<button
									onClick={handleSubmitDispute}
									disabled={isSubmittingDispute || !disputeOption}
									className="btn-primary !py-2 !px-4 font-semibold text-black dark:text-white hover:text-black dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl p-6 border border-slate-300 dark:border-white/10"
								>
									{isSubmittingDispute ? "Submitting..." : "Submit"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default TransactionDashboard;
