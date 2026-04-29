import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const Signin = () => {
	const [formData, setFormData] = useState({ identifier: "", password: "" });
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await axios.post(
				"http://localhost:5050/api/auth/login",
				formData,
			);
			if (response.data.success) {
				login(response.data.user, response.data.token);
				navigate("/profile");
			}
		} catch (err) {
			setError(
				err.response?.data?.message || "Login failed. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 md:px-12 py-8 sm:py-12">
			<div className="w-full max-w-md glass-panel-dark overflow-hidden p-0 shadow-2xl border border-white/10 animate-fade-in">
				<div className="bg-gradient-to-r from-brand-600/20 to-accent-600/20 p-6 sm:p-8 text-center border-b border-white/5">
					<h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
						Welcome Back
					</h2>
					<p className="mt-2 text-slate-600 dark:text-white/60 text-xs sm:text-sm">
						Securely access your trading dashboard
					</p>
				</div>

				<div className="p-6 sm:p-8 md:p-10">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2">
								Username or Email
							</label>
							<input
								type="text"
								name="identifier"
								required
								className="input-field text-sm"
								placeholder="Enter your credentials"
								onChange={handleChange}
							/>
						</div>

						<div>
							<label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2">
								Password
							</label>
							<input
								type="password"
								name="password"
								required
								className="input-field text-sm"
								placeholder="••••••••"
								onChange={handleChange}
							/>
						</div>

						{error && (
							<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium text-center">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="btn-gradient w-full py-3 sm:py-4 text-sm sm:text-base font-bold shadow-xl shadow-brand-500/20"
						>
							{loading ? "Authenticating..." : "Sign In"}
						</button>
					</form>

					<p className="mt-8 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
						>
							Create one
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Signin;
