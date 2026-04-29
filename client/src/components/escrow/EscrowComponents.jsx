import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	createPaymentStartedNotification,
	processEscrowAction,
} from "../../services/api";

/**
 * EscrowStatusBadge: Informational badge with consistent color mapping.
 */
export const EscrowStatusBadge = ({ status }) => {
	const styles = {
		PENDING_PAYMENT:
			"bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
		FUNDED: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
		SHIPPED:
			"bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
		DELIVERED:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
		RELEASED:
			"bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
		DISPUTED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
		REFUNDED:
			"bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400",
		CANCELLED:
			"bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
	};

	return (
		<span
			className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-black/5 dark:border-white/5 ${styles[status] || styles.CANCELLED}`}
		>
			{status?.replace("_", " ")}
		</span>
	);
};

/**
 * EscrowProgressTracker: A visual represention of the FSM.
 */
export const EscrowProgressTracker = ({ currentStatus }) => {
	const stages = [
		"PENDING_PAYMENT",
		"FUNDED",
		"SHIPPED",
		"DELIVERED",
		"RELEASED",
	];
	const currentIndex = stages.indexOf(currentStatus);
	const isTerminated = ["DISPUTED", "REFUNDED", "CANCELLED"].includes(
		currentStatus,
	);

	if (isTerminated) {
		return (
			<div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-500/5 border border-red-500/20 rounded-xl">
				<div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0">
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="3"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<div>
					<p className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest">
						Transaction Terminated
					</p>
					<p className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
						Current Status: {currentStatus}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between w-full relative pt-4 pb-8">
			{/* Connector Line */}
			<div className="absolute top-8 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -z-10" />
			<div
				className="absolute top-8 left-0 h-1 bg-brand-500 transition-all duration-1000 -z-10"
				style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
			/>

			{stages.map((stage, idx) => {
				const isActive = idx <= currentIndex;
				const isCurrent = idx === currentIndex;

				return (
					<div
						key={stage}
						className="flex flex-col items-center gap-3 relative"
					>
						<div
							className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
								isCurrent
									? "bg-brand-500 border-white dark:border-slate-950 ring-4 ring-brand-500/20 scale-125"
									: isActive
										? "bg-brand-500 border-white dark:border-slate-950"
										: "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/5"
							}`}
						>
							{isActive && (
								<svg
									className="w-3 h-3 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="4"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
						</div>
						<span
							className={`text-[9px] font-bold uppercase tracking-tighter absolute top-12 whitespace-nowrap ${
								isActive
									? "text-brand-600 dark:text-brand-400"
									: "text-slate-400"
							}`}
						>
							{stage.replace("_", " ")}
						</span>
					</div>
				);
			})}
		</div>
	);
};

/**
 * EscrowActionPanel: Role-based dynamic actions.
 */
export const EscrowActionPanel = ({ escrow, userId, userRole, onUpdate }) => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [disputeModal, setDisputeModal] = useState(false);
	const [reason, setReason] = useState("");
	const [trackingNumber, setTrackingNumber] = useState(
		escrow.ledger?.tracking_number || "",
	);
	const [shippingCarrier, setShippingCarrier] = useState(
		escrow.ledger?.shipping_carrier || "",
	);
	const [showTrackingForm, setShowTrackingForm] = useState(false);

	const status = escrow.status_matrix.escrow_status;
	const isLocked = escrow.ledger.is_locked;
	const isClosed = escrow.ledger.is_closed;
	const isSellerActor = userId === escrow.seller_id || userRole === "SELLER";

	const handlePayNow = async () => {
		try {
			const response = await createPaymentStartedNotification({
				buyer_id: escrow.buyer_id,
				escrow_id: escrow.escrow_id,
				product_name: escrow.product_name || escrow.product_id || "Product",
			});

			if (!response?.success) {
				console.warn("Payment-start notification not created:", response);
			}
		} catch (err) {
			console.warn("Failed to send payment-start notification:", err.message);
		}

		navigate(`/payment/${escrow.escrow_id}`);
	};

	const handleAction = async (target, actReason = "Manual update") => {
		setLoading(true);
		try {
			await processEscrowAction({
				escrow_id: escrow.escrow_id,
				target_state: target,
				user_id: userId,
				role: userRole,
				reason: actReason,
				tracking_number: trackingNumber || null,
				shipping_carrier: shippingCarrier || null,
			});
			onUpdate();
			setDisputeModal(false);
			setReason("");
			setShowTrackingForm(false);
		} catch (err) {
			alert(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (isClosed)
		return (
			<div className="text-center py-4">
				{status === "RELEASED" && isSellerActor ? (
					<div className="space-y-4">
						<div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
							Transaction Completed - Funds Available
						</div>
						<div className="text-lg font-bold text-slate-900 dark:text-white">
							₹{escrow.ledger.amount.toFixed(2)}
						</div>
						<button
							onClick={() =>
								navigate(`/cashout?amount=${escrow.ledger.amount}`)
							}
							className="btn-gradient !py-2 !px-6 text-sm font-bold"
						>
							Cashout Funds
						</button>
					</div>
				) : (
					<p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic opacity-50">
						Ledger Finalized
					</p>
				)}
			</div>
		);

	return (
		<div className="space-y-6">
			{/* Shipment Tracking Information */}
			{status !== "PENDING_PAYMENT" && (
				<div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-white/5">
					<div className="flex items-center justify-between mb-3">
						<h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
							<svg
								className="w-4 h-4 text-brand-500"
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
							Shipment Status
						</h4>
						{userId === escrow.seller_id && status === "FUNDED" && (
							<button
								onClick={() => setShowTrackingForm(!showTrackingForm)}
								className="text-xs font-semibold text-brand-600 hover:text-brand-700 underline"
							>
								{showTrackingForm ? "Hide" : "Add Tracking"}
							</button>
						)}
					</div>

					{showTrackingForm && (
						<div className="space-y-3 mb-4 pb-4 border-b border-slate-200 dark:border-white/5">
							<div>
								<label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
									Shipping Carrier
								</label>
								<select
									value={shippingCarrier}
									onChange={(e) => setShippingCarrier(e.target.value)}
									className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
								>
									<option value="">Select carrier...</option>
									<option value="FedEx">FedEx</option>
									<option value="UPS">UPS</option>
									<option value="USPS">USPS</option>
									<option value="DHL">DHL</option>
									<option value="Local">Local Courier</option>
									<option value="Hand Delivery">Hand Delivery</option>
								</select>
							</div>
							<div>
								<label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
									Tracking Number (Optional)
								</label>
								<input
									type="text"
									value={trackingNumber}
									onChange={(e) => setTrackingNumber(e.target.value)}
									placeholder="e.g., 1Z999AA10123456784"
									className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
								/>
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>
							<p className="text-slate-500 dark:text-slate-400 mb-1">
								Current Status
							</p>
							<div className="flex items-center gap-2">
								<span
									className={`w-2 h-2 rounded-full ${
										status === "SHIPPED" || status === "DELIVERED"
											? "bg-emerald-500"
											: status === "FUNDED"
												? "bg-blue-500"
												: "bg-slate-400"
									}`}
								></span>
								<p className="font-bold text-slate-900 dark:text-white uppercase">
									{status}
								</p>
							</div>
						</div>
						{(trackingNumber || shippingCarrier) && (
							<div>
								<p className="text-slate-500 dark:text-slate-400 mb-1">
									Tracking
								</p>
								<div className="space-y-0.5">
									{shippingCarrier && (
										<p className="font-bold text-slate-900 dark:text-white">
											{shippingCarrier}
										</p>
									)}
									{trackingNumber && (
										<p className="text-slate-700 dark:text-slate-300 font-mono">
											{trackingNumber}
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex flex-wrap gap-4">
				{/* Buyer Actions */}
				{userId === escrow.buyer_id && (
					<>
						{status === "PENDING_PAYMENT" && (
							<button
								onClick={handlePayNow}
								disabled={loading || isLocked}
								className="btn-gradient !rounded-xl text-sm flex-1"
							>
								{loading ? "Processing..." : "Pay Now"}
							</button>
						)}
						{status === "SHIPPED" && (
							<button
								onClick={() => handleAction("DELIVERED")}
								disabled={loading || isLocked}
								className="btn-gradient !rounded-xl text-sm flex-1"
							>
								{loading ? "Verifying..." : "Confirm Delivery Receipt"}
							</button>
						)}
						{status === "DELIVERED" && (
							<button
								onClick={() => handleAction("RELEASED")}
								disabled={loading || isLocked}
								className="btn-gradient !rounded-xl text-sm flex-1 bg-emerald-600 hover:bg-emerald-700"
							>
								{loading ? "Releasing..." : "Release Funds to Seller"}
							</button>
						)}
					</>
				)}

				{/* Seller Actions */}
				{userId === escrow.seller_id && (
					<>
						{status === "FUNDED" && (
							<button
								onClick={() => handleAction("SHIPPED")}
								disabled={loading || isLocked}
								className="btn-gradient !rounded-xl text-sm flex-1"
							>
								{loading ? "Processing..." : "Mark as Asset Shipped"}
							</button>
						)}
					</>
				)}

				{/* Dispute Action (Available to both if not released/refunded)
				{!isClosed && status !== "PENDING_PAYMENT" && (
					<button
						onClick={() => setDisputeModal(true)}
						disabled={loading || isLocked}
						className="btn-secondary !rounded-xl text-sm !text-red-600 !border-red-500/20 hover:!bg-red-500/5 px-6"
					>
						Report Problem
					</button>
				)} */}
			</div>

			{/* Internal Dispute Modal (Simple)
			{disputeModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100/70 dark:bg-slate-950/70 backdrop-blur-sm animate-fade-in">
					<div className="glass-panel bg-white dark:bg-slate-800 w-full max-w-md p-8 space-y-6">
						<h3 className="text-xl font-bold text-slate-900 dark:text-white">
							Raise Protocol Dispute
						</h3>
						<p className="text-sm text-slate-500">
							Describe the issue in detail. Funds will be frozen immediately.
						</p>
						<textarea
							className="w-full text-black dark:text-white bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm min-h-[120px]"
							placeholder="e.g. Asset not received, Item damaged, etc."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
						/>
						<div className="flex gap-4">
							<button
								onClick={() => setDisputeModal(false)}
								className="btn-secondary flex-1"
							>
								Cancel
							</button>
							<button
								onClick={() => handleAction("DISPUTED", reason)}
								disabled={!reason.trim() || loading}
								className="btn-gradient flex-1 bg-red-600 hover:bg-red-700"
							>
								{loading ? "Filing..." : "File Dispute"}
							</button>
						</div>
					</div>
				</div>
			)} */}
		</div>
	);
};

/**
 * EscrowAuditLog: Read-only event viewer.
 */
export const EscrowAuditLog = ({ logs }) => {
	if (!logs) return null;
	const sortedLogs = Object.values(logs).sort(
		(a, b) => b.timestamp - a.timestamp,
	);

	return (
		<div className="space-y-4">
			<h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
				Ledger Immutability Log
			</h4>
			<div className="space-y-3">
				{sortedLogs.map((log, i) => (
					<div
						key={i}
						className="flex gap-4 items-start pb-3 border-b border-slate-100 dark:border-white/5 last:border-0 opacity-80 hover:opacity-100 transition-opacity"
					>
						<div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0 shadow-sm" />
						<div className="space-y-1">
							<p className="text-sm font-bold text-slate-800 dark:text-slate-200">
								<span className="text-brand-500">{log.action_by}</span> moved to{" "}
								<span className="uppercase text-xs">{log.new_state}</span>
							</p>
							<p className="text-xs text-slate-500">{log.reason}</p>
							<p className="text-[9px] font-mono text-slate-400">
								{new Date(log.timestamp * 1000).toLocaleString()}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
