import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	// Check if token is expired (24 hours)
	const isTokenExpired = (token) => {
		if (!token) return true;
		try {
			// JWT tokens have 3 parts separated by dots
			const payload = JSON.parse(atob(token.split(".")[1]));
			const currentTime = Date.now() / 1000;
			return payload.exp < currentTime;
		} catch (e) {
			// If we can't parse the token, consider it expired
			return true;
		}
	};

	// Clear expired session
	const clearExpiredSession = () => {
		localStorage.removeItem("user");
		localStorage.removeItem("token");
		setUser(null);
	};

	useEffect(() => {
		// Check local storage for existing session
		const savedUser = localStorage.getItem("user");
		const token = localStorage.getItem("token");

		if (savedUser && token) {
			// Check if token is expired
			if (isTokenExpired(token)) {
				clearExpiredSession();
			} else {
				setUser(JSON.parse(savedUser));
			}
		}
		setLoading(false);

		// Set up periodic token check (every 5 minutes)
		const interval = setInterval(
			() => {
				const currentToken = localStorage.getItem("token");
				if (currentToken && isTokenExpired(currentToken)) {
					clearExpiredSession();
					// Redirect to signin if on a protected page
					if (
						window.location.pathname !== "/signin" &&
						window.location.pathname !== "/signup"
					) {
						window.location.href = "/signup";
					}
				}
			},
			5 * 60 * 1000,
		); // Check every 5 minutes

		return () => clearInterval(interval);
	}, []);

	const login = (userData, token) => {
		localStorage.setItem("user", JSON.stringify(userData));
		localStorage.setItem("token", token);
		setUser(userData);
	};

	const logout = () => {
		localStorage.removeItem("user");
		localStorage.removeItem("token");
		setUser(null);
	};

	const updateProfile = (newData) => {
		const updatedUser = { ...user, ...newData };
		localStorage.setItem("user", JSON.stringify(updatedUser));
		setUser(updatedUser);
	};

	return (
		<AuthContext.Provider
			value={{ user, login, logout, updateProfile, loading }}
		>
			{!loading && children}
		</AuthContext.Provider>
	);
};
