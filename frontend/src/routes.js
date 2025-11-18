import Dashboard from "layouts/dashboard";

import SignUp from "layouts/LoginRegister/SignUp";
import Login from "layouts/LoginRegister/Login";
import UserProfile from "layouts/UserProfile";

import Icon from "@mui/material/Icon";
import ProtectedComponent from "components/ProtectedComponent";

const routes = [
	// Main app routes (protected)
	{
		type: "collapse",
		name: "Dashboard",
		key: "dashboard",
		icon: <Icon fontSize="small">dashboard</Icon>,
		route: "/dashboard",
		component: <ProtectedComponent component={<Dashboard />} />,
		protected: true,
	},

	// Authentication routes (public)
	{
		name: "Sign Up",
		key: "sign-up",
		route: "/sign-up",
		component: <SignUp />,
		public: true,
	},
	{
		name: "Login",
		key: "login",
		route: "/login",
		component: <Login />,
		public: true,
	},

	// User profile (protected)
	{
		type: "collapse",
		name: "User Profile",
		key: "user-profile",
		icon: <Icon fontSize="small">person</Icon>,
		route: "/user/profile",
		component: <ProtectedComponent component={<UserProfile />} />,
		protected: true,
	},
];

export const getRoutes = () => {
	const token = localStorage.getItem("token");
	const loggedIn = !!token;

	// If not logged in, show only public routes
	if (!loggedIn) {
		return routes.filter((route) => route.public);
	}

	// If logged in, show only protected routes (and hide public auth routes)
	return routes.filter((route) => route.protected);
};
