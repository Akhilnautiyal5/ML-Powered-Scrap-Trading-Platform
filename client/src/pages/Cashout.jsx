import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserEarnings, requestCashout } from "../services/api";

const Cashout = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [earningsData, setEarningsData] = useState({
		current_balance: 0,
		total_earned: 0,
		total_cashed_out: 0,
	});
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [form, setForm] = useState({
		method: "BANK",
		account_holder_name: user?.full_name || user?.username || "",
		mobile: "",
		bank_account_number: "",
		ifsc_code: "",
		upi_id: "",
	});

	// Get amount from URL parameter
	const urlParams = new URLSearchParams(window.location.search);
	const requestedAmountParam = urlParams.get("amount");
	const parsedAmount = requestedAmountParam
		? parseFloat(requestedAmountParam)
		: null;
	const specificAmount = Number.isFinite(parsedAmount) ? parsedAmount : null;
	const fixedAmountFromQuery =
		specificAmount !== null &&
		specificAmount > 0 &&
		Number.isFinite(specificAmount);

	const [amountInput, setAmountInput] = useState(
		fixedAmountFromQuery ? specificAmount.toFixed(2) : "",
	);

	useEffect(() => {
		if (user) {
			fetchWalletData();
			const phone = String(user?.phone || "")
				.replace(/\D/g, "")
				.slice(-10);
			setForm((prev) => ({
				...prev,
				account_holder_name:
					user?.full_name || user?.username || prev.account_holder_name,
				mobile: phone || prev.mobile,
			}));
		}
	}, [user]);

	useEffect(() => {
		if (!user) {
			navigate("/signup");
		}
	}, [user, navigate]);

	useEffect(() => {
		if (
			!fixedAmountFromQuery &&
			earningsData.current_balance > 0 &&
			!amountInput
		) {
			setAmountInput(String(earningsData.current_balance.toFixed(2)));
		}
	}, [fixedAmountFromQuery, earningsData.current_balance, amountInput]);

	const amount = useMemo(() => {
		if (fixedAmountFromQuery) {
			return specificAmount || 0;
		}
		const parsed = parseFloat(amountInput);
		return Number.isFinite(parsed) ? parsed : 0;
	}, [fixedAmountFromQuery, specificAmount, amountInput]);

	const fetchWalletData = async () => {
		try {
			setLoading(true);
			const res = await getUserEarnings(user.uid);
			if (res.success) {
				setEarningsData(res.earnings || {});
			}
		} catch (err) {
			console.error("Error fetching wallet data:", err);
			setError("Failed to load wallet information");
		} finally {
			setLoading(false);
		}
	};

	const validateCommonFields = () => {
		if (!form.account_holder_name.trim()) {
			setError("Account holder name is required.");
			return false;
		}

		const mobileDigits = form.mobile.replace(/\D/g, "");
		if (!/^[6-9]\d{9}$/.test(mobileDigits)) {
			setError("Enter a valid 10-digit mobile number.");
			return false;
		}

		if (form.method === "UPI") {
			if (!form.upi_id.trim()) {
				setError("UPI ID is required.");
				return false;
			}
		} else if (!form.bank_account_number.trim() || !form.ifsc_code.trim()) {
			setError("Bank account number and IFSC code are required.");
			return false;
		}

		if (amount < 100) {
			setError("Minimum cashout amount is INR 100.");
			return false;
		}

		if (amount > (earningsData.current_balance || 0)) {
			setError("Cashout amount exceeds your available balance.");
			return false;
		}

		return true;
	};

	const handleCashout = async () => {
		try {
			setProcessing(true);
			setError("");
			setMessage("");

			if (!validateCommonFields()) {
				return;
			}

			const res = await requestCashout({
				user_id: user.uid,
				amount,
				method: form.method,
				mobile: form.mobile.replace(/\D/g, ""),
				account_holder_name: form.account_holder_name,
				upi_id: form.method === "UPI" ? form.upi_id : "",
				bank_account_number:
					form.method === "BANK" ? form.bank_account_number : "",
				ifsc_code: form.method === "BANK" ? form.ifsc_code.toUpperCase() : "",
			});

			if (res.success) {
				const expectedByLabel = res.settlement_expected_by
					? new Date(res.settlement_expected_by * 1000).toLocaleDateString()
					: null;
				setMessage(
					`Cashout request created for INR ${amount.toFixed(2)}. Payout ID: ${res.payout_id}${expectedByLabel ? `. Expected by: ${expectedByLabel}` : ""}`,
				);
				await fetchWalletData();
			}
		} catch (err) {
			setError(err.message || "Unable to initiate cashout.");
		} finally {
			setProcessing(false);
		}
	};

	if (!user) {
		return null;
	}

	if (loading) {
		return (
			<div className="section-container mt-12 mb-24 flex items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500 mx-auto mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">
						Loading wallet information...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="section-container mt-6 sm:mt-12 mb-12 sm:mb-24 px-4 sm:px-6">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
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
						Back to Profile
					</button>
				</div>

				<div className="text-center mb-8">
					<h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 dark:text-white mb-4">
						Cashout (Stripe-simulated)
					</h1>
					<p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
						Withdraw your earnings to a bank account or UPI (dummy details).
						This simulates a payout from the platform's Stripe balance.
					</p>
				</div>

				<div className="glass-panel p-8">
					<div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
							<p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
								Available Balance
							</p>
							<p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
								INR {(earningsData.current_balance || 0).toFixed(2)}
							</p>
						</div>
						<div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
							<p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
								Total Earned
							</p>
							<p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
								INR {(earningsData.total_earned || 0).toFixed(2)}
							</p>
						</div>
						<div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
							<p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
								Total Cashed Out
							</p>
							<p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
								INR {(earningsData.total_cashed_out || 0).toFixed(2)}
							</p>
						</div>
					</div>

					<div className="text-center mb-8">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
							<svg
								className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
								/>
							</svg>
						</div>
						<h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
							{fixedAmountFromQuery
								? "Cashout Transaction Amount"
								: "Cashout Amount"}
						</h2>

						{fixedAmountFromQuery ? (
							<p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-4">
								INR {amount.toFixed(2)}
							</p>
						) : (
							<div className="max-w-sm mx-auto mb-4">
								<input
									type="number"
									min="100"
									step="0.01"
									value={amountInput}
									onChange={(e) => {
										setAmountInput(e.target.value);
									}}
									className="input-field text-center text-2xl font-black"
									placeholder="Enter amount"
								/>
							</div>
						)}
						<p className="text-sm text-slate-600 dark:text-slate-400">
							{fixedAmountFromQuery
								? "Amount from this transaction"
								: "Minimum cashout amount: INR 100"}
						</p>
						{fixedAmountFromQuery ? (
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
								Available balance: INR
								{(earningsData.current_balance || 0).toFixed(2)}
							</p>
						) : null}
					</div>

					{(earningsData.current_balance || 0) >= 100 ? (
						<div className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
										Payout Method
									</label>
									<select
										value={form.method}
										onChange={(e) => {
											setForm((prev) => ({ ...prev, method: e.target.value }));
										}}
										className="input-field"
									>
										<option value="BANK">Bank Account</option>
										<option value="UPI">UPI ID</option>
									</select>
								</div>
								<div>
									<label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
										Account Holder Name
									</label>
									<input
										type="text"
										className="input-field"
										value={form.account_holder_name}
										onChange={(e) => {
											setForm((prev) => ({
												...prev,
												account_holder_name: e.target.value,
											}));
										}}
									/>
								</div>
							</div>

							<div>
								<label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
									Mobile Number
								</label>
								<input
									type="text"
									className="input-field"
									placeholder="10-digit mobile"
									maxLength={10}
									value={form.mobile}
									onChange={(e) => {
										setForm((prev) => ({
											...prev,
											mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
										}));
									}}
								/>
							</div>

							{form.method === "BANK" ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
											Bank Account Number
										</label>
										<input
											type="text"
											className="input-field"
											value={form.bank_account_number}
											onChange={(e) => {
												setForm((prev) => ({
													...prev,
													bank_account_number: e.target.value.replace(
														/\D/g,
														"",
													),
												}));
											}}
										/>
									</div>
									<div>
										<label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
											IFSC Code
										</label>
										<input
											type="text"
											className="input-field uppercase"
											value={form.ifsc_code}
											onChange={(e) => {
												setForm((prev) => ({
													...prev,
													ifsc_code: e.target.value.toUpperCase(),
												}));
											}}
										/>
									</div>
								</div>
							) : (
								<div>
									<label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
										UPI ID
									</label>
									<input
										type="text"
										className="input-field"
										placeholder="name@bank"
										value={form.upi_id}
										onChange={(e) => {
											setForm((prev) => ({ ...prev, upi_id: e.target.value }));
										}}
									/>
								</div>
							)}

							<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
								<div className="flex items-start gap-3">
									<svg
										className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
										/>
									</svg>
									<div>
										<h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
											Submit Cashout Request
										</h3>
										<p className="text-sm text-amber-700 dark:text-amber-300">
											Money will be
											sent within 3 days.
										</p>
									</div>
								</div>
							</div>

							<button
								onClick={handleCashout}
								disabled={processing}
								className="w-full btn-gradient py-4 text-lg font-bold shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{processing ? (
									<div className="flex items-center justify-center gap-2">
										<div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
										Processing Cashout...
									</div>
								) : (
									`Request Cashout INR ${amount.toFixed(2)}`
								)}
							</button>
						</div>
					) : (
						<div className="text-center py-8">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
								<svg
									className="w-6 h-6 text-slate-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
								Insufficient Balance
							</h3>
							<p className="text-slate-600 dark:text-slate-400 mb-4">
								You need at least INR 100 to initiate a cashout. Keep selling
								items to build up your balance!
							</p>
							<button
								onClick={() => navigate("/browse")}
								className="btn-secondary"
							>
								Browse Marketplace
							</button>
						</div>
					)}

					{message && (
						<div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
							<p className="text-blue-800 dark:text-blue-200 text-center">
								{message}
							</p>
						</div>
					)}
					{error && (
						<div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
							<p className="text-red-800 dark:text-red-200 text-center">
								{error}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Cashout;
