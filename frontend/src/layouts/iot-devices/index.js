import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

import DeviceTable from "components/IoTDevices/DeviceTable";
import deviceService from "services/deviceService";

function IoTDevices() {
	const navigate = useNavigate();
	const [devices, setDevices] = useState([]);
	const [fleetHealth, setFleetHealth] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filters, setFilters] = useState({
		carId: "",
		deviceType: "",
		status: "",
	});

	useEffect(() => {
		// Initial load with loading indicator
		fetchDevices();
		fetchFleetHealth();

		// Auto-refresh every 10 seconds in background (no loading indicator)
		const refreshInterval = setInterval(() => {
			fetchDevices({}, false); // false = don't show loading spinner
			fetchFleetHealth();
		}, 10000); // 10 seconds

		return () => clearInterval(refreshInterval);
	}, []);

	const fetchDevices = async (appliedFilters = {}, showLoading = true) => {
		try {
			if (showLoading) {
				setLoading(true);
			}
			setError(null);
			const response = await deviceService.getAllDevices(appliedFilters);
			setDevices(response.devices || []);
		} catch (err) {
			console.error("Error fetching devices:", err);
			setError(err.message || "Failed to fetch devices");
			setDevices([]);
		} finally {
			if (showLoading) {
				setLoading(false);
			}
		}
	};

	const fetchFleetHealth = async () => {
		try {
			const response = await deviceService.getFleetHealth();
			setFleetHealth(response);
		} catch (err) {
			console.error("Error fetching fleet health:", err);
		}
	};

	const handleFilterChange = (field, value) => {
		setFilters((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleApplyFilters = () => {
		const activeFilters = {};
		if (filters.carId) activeFilters.carId = filters.carId;
		if (filters.deviceType) activeFilters.deviceType = filters.deviceType;
		if (filters.status) activeFilters.status = filters.status;
		fetchDevices(activeFilters);
	};

	const handleClearFilters = () => {
		setFilters({
			carId: "",
			deviceType: "",
			status: "",
		});
		fetchDevices();
	};

	const handleRowClick = (device) => {
		navigate(`/iot-devices/${device.device_id}`);
	};

	const handleRegisterDevice = () => {
		navigate("/iot-devices/register");
	};

	const handleFleetAnalytics = () => {
		navigate("/iot-devices/fleet/analytics");
	};

	const handleFirmwareManagement = () => {
		navigate("/iot-devices/firmware/management");
	};

	return (
		<DashboardLayout>
			<DashboardNavbar />
			<MDBox pt={6} pb={3}>
				<Grid container spacing={3}>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox
							mb={1.5}
							sx={{ transition: "all 0.3s ease-in-out" }}
						>
							<ComplexStatisticsCard
								color="dark"
								title="Total Devices"
								count={fleetHealth?.health?.total_devices || 0}
							/>
						</MDBox>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox
							mb={1.5}
							sx={{ transition: "all 0.3s ease-in-out" }}
						>
							<ComplexStatisticsCard
								color="success"
								title="Online"
								count={fleetHealth?.health?.online_count || 0}
							/>
						</MDBox>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox
							mb={1.5}
							sx={{ transition: "all 0.3s ease-in-out" }}
						>
							<ComplexStatisticsCard
								color="error"
								title="Offline"
								count={fleetHealth?.health?.offline_count || 0}
							/>
						</MDBox>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox
							mb={1.5}
							sx={{ transition: "all 0.3s ease-in-out" }}
						>
							<ComplexStatisticsCard
								color="warning"
								title="Idle"
								count={fleetHealth?.health?.idle_count || 0}
							/>
						</MDBox>
					</Grid>
				</Grid>

				<MDBox mt={4.5}>
					<Grid container spacing={3}>
						<Grid item xs={12}>
							<Card>
								<MDBox
									mx={2}
									mt={-3}
									py={3}
									px={2}
									variant="gradient"
									bgColor="info"
									borderRadius="lg"
									coloredShadow="info"
									display="flex"
									justifyContent="space-between"
									alignItems="center"
								>
									<MDTypography variant="h6" color="white">
										IoT Devices
									</MDTypography>
									<MDBox display="flex" gap={1}>
										<Button
											variant="contained"
											color="white"
											size="small"
											onClick={handleRegisterDevice}
											sx={{
												backgroundColor: "white",
												color: "info.main",
												"&:hover": {
													backgroundColor: "grey.100",
												},
											}}
										>
											Register Device
										</Button>
										<Button
											variant="outlined"
											size="small"
											onClick={handleFleetAnalytics}
											sx={{
												color: "white",
												borderColor: "white",
												"&:hover": {
													borderColor: "white",
													backgroundColor:
														"rgba(255,255,255,0.1)",
												},
											}}
										>
											Fleet Analytics
										</Button>
										<Button
											variant="outlined"
											size="small"
											onClick={handleFirmwareManagement}
											sx={{
												color: "white",
												borderColor: "white",
												"&:hover": {
													borderColor: "white",
													backgroundColor:
														"rgba(255,255,255,0.1)",
												},
											}}
										>
											Firmware
										</Button>
									</MDBox>
								</MDBox>

								<MDBox p={3}>
									<Grid container spacing={2} mb={3}>
										<Grid item xs={12} md={3}>
											<TextField
												fullWidth
												variant="outlined"
												label="Car ID"
												value={filters.carId}
												onChange={(e) =>
													handleFilterChange(
														"carId",
														e.target.value
													)
												}
												size="small"
												InputLabelProps={{
													shrink: true,
												}}
											/>
										</Grid>
										<Grid item xs={12} md={3}>
											<TextField
												fullWidth
												select
												variant="outlined"
												label="Device Type"
												value={filters.deviceType}
												onChange={(e) =>
													handleFilterChange(
														"deviceType",
														e.target.value
													)
												}
												size="small"
												InputLabelProps={{
													shrink: true,
												}}
												SelectProps={{
													displayEmpty: true,
												}}
												sx={{
													"& .MuiOutlinedInput-root":
														{
															height: "37.5px",
														},
												}}
											>
												<MenuItem value="">
													All Types
												</MenuItem>
												<MenuItem value="OBD_Scanner">
													OBD Scanner
												</MenuItem>
												<MenuItem value="GPS_Tracker">
													GPS Tracker
												</MenuItem>
												<MenuItem value="Dashcam">
													Dashcam
												</MenuItem>
												<MenuItem value="Sensor_Module">
													Sensor Module
												</MenuItem>
											</TextField>
										</Grid>
										<Grid item xs={12} md={3}>
											<TextField
												fullWidth
												select
												variant="outlined"
												label="Status"
												value={filters.status}
												onChange={(e) =>
													handleFilterChange(
														"status",
														e.target.value
													)
												}
												size="small"
												InputLabelProps={{
													shrink: true,
												}}
												SelectProps={{
													displayEmpty: true,
												}}
												sx={{
													"& .MuiOutlinedInput-root":
														{
															height: "37.5px",
														},
												}}
											>
												<MenuItem value="">
													All Status
												</MenuItem>
												<MenuItem value="online">
													Online
												</MenuItem>
												<MenuItem value="offline">
													Offline
												</MenuItem>
												<MenuItem value="maintenance">
													Maintenance
												</MenuItem>
											</TextField>
										</Grid>
										<Grid
											item
											xs={12}
											md={3}
											display="flex"
											gap={1}
										>
											<Button
												variant="contained"
												color="info"
												fullWidth
												onClick={handleApplyFilters}
											>
												Apply
											</Button>
											<Button
												variant="outlined"
												color="info"
												fullWidth
												onClick={handleClearFilters}
											>
												Clear
											</Button>
										</Grid>
									</Grid>

									{loading && (
										<MDBox py={3} textAlign="center">
											<MDTypography
												variant="body2"
												color="text"
											>
												Loading devices...
											</MDTypography>
										</MDBox>
									)}

									{error && (
										<MDBox py={3} textAlign="center">
											<MDTypography
												variant="body2"
												color="error"
											>
												{error}
											</MDTypography>
										</MDBox>
									)}

									{!loading &&
										!error &&
										devices.length === 0 && (
											<MDBox py={3} textAlign="center">
												<MDTypography
													variant="body2"
													color="text"
												>
													No devices found
												</MDTypography>
											</MDBox>
										)}

									{!loading &&
										!error &&
										devices.length > 0 && (
											<DeviceTable
												devices={devices}
												onRowClick={handleRowClick}
											/>
										)}
								</MDBox>
							</Card>
						</Grid>
					</Grid>
				</MDBox>
			</MDBox>
			<Footer />
		</DashboardLayout>
	);
}

export default IoTDevices;
