import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^[6-9][0-9]{9}$/;

const Signup = () => {
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
		full_name: "",
		phone: "",
	});
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!EMAIL_PATTERN.test(formData.email.trim())) {
			setError("Enter a valid email address.");
			return;
		}

		if (formData.password.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}

		if (formData.phone.trim() && !PHONE_PATTERN.test(formData.phone.trim())) {
			setError("Enter a valid 10-digit Indian phone number.");
			return;
		}

		setLoading(true);

		try {
			const response = await axios.post(
				"http://localhost:5050/api/auth/register",
				formData,
			);
			if (response.data.success) {
				navigate("/signin");
			}
		} catch (err) {
			setError(
				err.response?.data?.message || "Registration failed. Try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-[90vh] flex items-center justify-center px-4 sm:px-6 md:px-12 py-8 sm:py-12">
			<div className="w-full max-w-lg glass-panel-dark overflow-hidden p-0 shadow-2xl border border-white/10 animate-fade-in">
				<div className="bg-gradient-to-r from-teal-600/20 to-emerald-600/20 p-6 sm:p-8 text-center border-b border-white/5 shadow-inner">
					<h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
						Join the Network
					</h2>
					<p className="mt-2 text-slate-600 dark:text-white/60 text-xs sm:text-sm italic">
						Start your AI-powered trading journey today
					</p>
				</div>

				<div className="p-6 sm:p-8 md:p-10">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
									Username *
								</label>
								<input
									type="text"
									name="username"
									required
									className="input-field"
									placeholder="CoolTrader42"
									onChange={handleChange}
								/>
							</div>
							<div>
								<label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
									Email *
								</label>
								<input
									type="email"
									name="email"
									value={formData.email}
									required
									className="input-field"
									placeholder="alex@example.com"
									pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
									title="Enter a valid email address"
									onChange={handleChange}
								/>
							</div>
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
								Password *
							</label>
							<input
								type="password"
								name="password"
								required
								className="input-field"
								placeholder="••••••••"
								onChange={handleChange}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
									Full Name
								</label>
								<input
									type="text"
									name="full_name"
									className="input-field"
									placeholder="Alex Johnson"
									onChange={handleChange}
								/>
							</div>
							<div>
								<label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2 block">
									Phone Number
								</label>
								<input
									type="tel"
									name="phone"
									value={formData.phone}
									className="input-field"
									placeholder="9876543210"
									pattern="[6-9][0-9]{9}"
									title="Enter a 10-digit Indian mobile number"
									onChange={handleChange}
								/>
							</div>
						</div>

						{error && (
							<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium text-center">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="btn-gradient w-full py-4 text-base font-bold shadow-xl shadow-brand-500/20 uppercase tracking-widest"
						>
							{loading ? "Creating Account..." : "Initialize Profile"}
						</button>
					</form>

					<p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
						Already a member?{" "}
						<Link
							to="/signin"
							className="text-brand-600 dark:text-brand-400 font-bold hover:underline italic"
						>
							Sign in to your account
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Signup;
