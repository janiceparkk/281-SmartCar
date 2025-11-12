import Dashboard from "layouts/dashboard";
import Tables from "layouts/tables";
import Billing from "layouts/billing";
import RTL from "layouts/rtl";
import Notifications from "layouts/notifications";
import Profile from "layouts/profile";

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
	{
		type: "collapse",
		name: "Tables",
		key: "tables",
		icon: <Icon fontSize="small">table_view</Icon>,
		route: "/tables",
		component: <ProtectedComponent component={<Tables />} />,
		protected: true,
	},
	{
		type: "collapse",
		name: "Billing",
		key: "billing",
		icon: <Icon fontSize="small">receipt_long</Icon>,
		route: "/billing",
		component: <ProtectedComponent component={<Billing />} />,
		protected: true,
	},
	{
		type: "collapse",
		name: "RTL",
		key: "rtl",
		icon: <Icon fontSize="small">format_textdirection_r_to_l</Icon>,
		route: "/rtl",
		component: <ProtectedComponent component={<RTL />} />,
		protected: true,
	},
	{
		type: "collapse",
		name: "Notifications",
		key: "notifications",
		icon: <Icon fontSize="small">notifications</Icon>,
		route: "/notifications",
		component: <ProtectedComponent component={<Notifications />} />,
		protected: true,
	},
	{
		type: "collapse",
		name: "Profile",
		key: "profile",
		icon: <Icon fontSize="small">person</Icon>,
		route: "/profile",
		component: <ProtectedComponent component={<Profile />} />,
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
