import { useEffect } from "react";
import axios from "axios";
import Dashboard from "layouts/dashboard";

import SignUp from "layouts/LoginRegister/SignUp";
import Login from "layouts/LoginRegister/Login";
import UserProfile from "layouts/UserProfile";
import LogDetails from "layouts/dashboard/components/ServiceLogs/logDetails";
import CarlaDashboard from "layouts/CarlaDashboard";

// IoT Device Management Layouts
import IoTDevices from "layouts/iot-devices";
import RegisterDevice from "layouts/iot-devices/RegisterDevice";
import DeviceDetails from "layouts/iot-devices/DeviceDetails";
import TelemetryDashboard from "layouts/iot-devices/TelemetryDashboard";
import CommandCenter from "layouts/iot-devices/CommandCenter";
import FleetAnalytics from "layouts/iot-devices/FleetAnalytics";
import FirmwareManagement from "layouts/iot-devices/FirmwareManagement";

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

	async function fetchActiveCars() {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get(
				"http://localhost:5000/api/cars/active",
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			return res;
		} catch (error) {
			return false;
		}
	}

	async function fetchActiveDevices() {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get(
				"http://localhost:5000/api/devices/active",
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			return res;
		} catch (error) {
			console.error("Error fetching active devices:", error);
			return { data: { count: 0 } };
		}
	}

	async function fetchActiveRequests() {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get(
				"http://localhost:5000/api/serviceRequests?status=In Progress",
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			return res;
		} catch (error) {
			console.error("Error fetching active requests:", error);
			return { data: { count: 0 } };
		}
	}

	const routes = [
		// Main app routes (protected)
		{
			type: "collapse",
			name: "Dashboard",
			key: "dashboard",
			icon: <Icon fontSize="small">dashboard</Icon>,
			route: "/dashboard",
			component: (
				<ProtectedComponent
					component={
						<Dashboard
							fetchActiveCars={fetchActiveCars}
							fetchActiveRequests={fetchActiveRequests}
							fetchActiveDevices={fetchActiveDevices}
						/>
					}
				/>
			),
			protected: true,
		},
		{
			key: "log-details",
			route: "/logs/:logId",
			component: <ProtectedComponent component={<LogDetails />} />,
			protected: true,
		},

		// IoT Device Management (protected)
		{
			type: "collapse",
			name: "IoT Devices",
			key: "iot-devices",
			icon: <Icon fontSize="small">devices</Icon>,
			route: "/iot-devices",
			component: <ProtectedComponent component={<IoTDevices />} />,
			protected: true,
		},
		{
			key: "register-device",
			route: "/iot-devices/register",
			component: <ProtectedComponent component={<RegisterDevice />} />,
			protected: true,
		},
		{
			key: "device-details",
			route: "/iot-devices/:deviceId",
			component: <ProtectedComponent component={<DeviceDetails />} />,
			protected: true,
		},
		{
			key: "telemetry-dashboard",
			route: "/iot-devices/:deviceId/telemetry",
			component: (
				<ProtectedComponent component={<TelemetryDashboard />} />
			),
			protected: true,
		},
		{
			key: "command-center",
			route: "/iot-devices/:deviceId/commands",
			component: <ProtectedComponent component={<CommandCenter />} />,
			protected: true,
		},
		{
			key: "fleet-analytics",
			route: "/iot-devices/fleet/analytics",
			component: <ProtectedComponent component={<FleetAnalytics />} />,
			protected: true,
		},
		{
			key: "firmware-management",
			route: "/iot-devices/firmware/management",
			component: (
				<ProtectedComponent component={<FirmwareManagement />} />
			),
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
		{
			type: "collapse",
			name: "Car Dashboard/Config",
			key: "car-config",
			icon: <Icon fontSize="small">config</Icon>,
			route: "/car/config",
			component: <ProtectedComponent component={<CarlaDashboard />} />,
			protected: true,
		},
		,
	];

	// If not logged in, show only public routes
	if (!loggedIn) {
		return routes.filter((route) => route.public);
	}

	// If logged in, show only protected routes (and hide public auth routes)
	return routes.filter((route) => route.protected);
};
