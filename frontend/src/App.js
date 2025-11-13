/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect, useMemo } from "react";
import {
	Routes,
	Route,
	Navigate,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

import MDBox from "components/MDBox";
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

import { getRoutes } from "routes";

import {
	useMaterialUIController,
	setMiniSidenav,
	setOpenConfigurator,
} from "context";

import brandWhite from "assets/images/logo-ct.png";
import brandDark from "assets/images/logo-ct-dark.png";

export default function App() {
	const [controller, dispatch] = useMaterialUIController();
	const {
		miniSidenav,
		direction,
		layout,
		openConfigurator,
		sidenavColor,
		transparentSidenav,
		whiteSidenav,
		darkMode,
	} = controller;

	const [onMouseEnter, setOnMouseEnter] = useState(false);
	const [rtlCache, setRtlCache] = useState(null);
	const { pathname } = useLocation();

	// Track login status
	const [isLoggedIn, setIsLoggedIn] = useState(
		!!localStorage.getItem("token")
	);

	// Filter routes based on auth
	const routes = useMemo(() => getRoutes(), [isLoggedIn]);

	// RTL cache
	useMemo(() => {
		const cacheRtl = createCache({
			key: "rtl",
			stylisPlugins: [rtlPlugin],
		});
		setRtlCache(cacheRtl);
	}, []);

	// Sidenav hover handlers
	const handleOnMouseEnter = () => {
		if (miniSidenav && !onMouseEnter) {
			setMiniSidenav(dispatch, false);
			setOnMouseEnter(true);
		}
	};
	const handleOnMouseLeave = () => {
		if (onMouseEnter) {
			setMiniSidenav(dispatch, true);
			setOnMouseEnter(false);
		}
	};

	const handleConfiguratorOpen = () =>
		setOpenConfigurator(dispatch, !openConfigurator);

	// Set body dir for RTL
	useEffect(() => {
		document.body.setAttribute("dir", direction);
	}, [direction]);

	// Reset scroll on route change
	useEffect(() => {
		document.documentElement.scrollTop = 0;
		document.scrollingElement.scrollTop = 0;
	}, [pathname]);

	// Recursive route rendering
	const renderRoutes = (allRoutes) =>
		allRoutes.map((route) => {
			if (route.collapse) return renderRoutes(route.collapse);
			if (route.route)
				return (
					<Route
						path={route.route}
						element={route.component}
						key={route.key}
					/>
				);
			return null;
		});

	// Configurator button
	const configsButton = (
		<MDBox
			display="flex"
			justifyContent="center"
			alignItems="center"
			width="3.25rem"
			height="3.25rem"
			bgColor="white"
			shadow="sm"
			borderRadius="50%"
			position="fixed"
			right="2rem"
			bottom="2rem"
			zIndex={99}
			color="dark"
			sx={{ cursor: "pointer" }}
			onClick={handleConfiguratorOpen}
		>
			<Icon fontSize="small" color="inherit">
				settings
			</Icon>
		</MDBox>
	);

	// Theme wrapper
	const themeProvider =
		direction === "rtl" ? (
			<ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
				<CssBaseline />
				{layout === "dashboard" && (
					<>
						<Sidenav
							color={sidenavColor}
							brand={
								(transparentSidenav && !darkMode) ||
								whiteSidenav
									? brandDark
									: brandWhite
							}
							brandName="Material Dashboard 2"
							routes={routes}
							onMouseEnter={handleOnMouseEnter}
							onMouseLeave={handleOnMouseLeave}
						/>
						<Configurator />
						{configsButton}
					</>
				)}
				{layout === "vr" && <Configurator />}
				<Routes>
					{/* Render all defined routes first */}
					{renderRoutes(routes)}

					{/* Conditional redirects for authenticated users */}
					{isLoggedIn ? (
						<>
							<Route
								path="/login"
								element={<Navigate to="/dashboard" replace />}
							/>
							<Route
								path="/sign-up"
								element={<Navigate to="/dashboard" replace />}
							/>
							<Route
								path="*"
								element={<Navigate to="/dashboard" replace />}
							/>
						</>
					) : (
						<>
							<Route
								path="*"
								element={<Navigate to="/login" replace />}
							/>
						</>
					)}
				</Routes>
			</ThemeProvider>
		) : (
			<ThemeProvider theme={darkMode ? themeDark : theme}>
				<CssBaseline />
				{layout === "dashboard" && (
					<>
						<Sidenav
							color={sidenavColor}
							brand={
								(transparentSidenav && !darkMode) ||
								whiteSidenav
									? brandDark
									: brandWhite
							}
							brandName="Material Dashboard 2"
							routes={routes}
							onMouseEnter={handleOnMouseEnter}
							onMouseLeave={handleOnMouseLeave}
						/>
						<Configurator />
						{configsButton}
					</>
				)}
				{layout === "vr" && <Configurator />}
				<Routes>
					{/* Render all defined routes first */}
					{renderRoutes(routes)}

					{/* Conditional redirects for authenticated users */}
					{isLoggedIn ? (
						<>
							<Route
								path="/login"
								element={<Navigate to="/dashboard" replace />}
							/>
							<Route
								path="/sign-up"
								element={<Navigate to="/dashboard" replace />}
							/>
							<Route
								path="*"
								element={<Navigate to="/dashboard" replace />}
							/>
						</>
					) : (
						<>
							<Route
								path="*"
								element={<Navigate to="/login" replace />}
							/>
						</>
					)}
				</Routes>
			</ThemeProvider>
		);

	return direction === "rtl" ? (
		<CacheProvider value={rtlCache}>{themeProvider}</CacheProvider>
	) : (
		themeProvider
	);
}
