// src/context/AuthContext.js
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(localStorage.getItem("token") || null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (token) {
			localStorage.setItem("token", token);
			// You can also fetch user info from your backend if needed
			setUser({}); // placeholder; or fetch from /auth/user
		} else {
			localStorage.removeItem("token");
			setUser(null);
		}
		setLoading(false);
	}, [token]);

	const login = (token, userInfo) => {
		setToken(token);
		setUser(userInfo || {});
	};

	const logout = () => {
		setToken(null);
		setUser(null);
	};

	return (
		<AuthContext.Provider
			value={{ user, token, login, logout, loading, isLoggedIn: !!token }}
		>
			{children}
		</AuthContext.Provider>
	);
};
