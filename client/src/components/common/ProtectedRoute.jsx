import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = ({ children }) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500 mx-auto mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">Loading...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		// Redirect to signup page with return url
		return <Navigate to="/signup" state={{ from: location }} replace />;
	}

	return children;
};

export default ProtectedRoute;
