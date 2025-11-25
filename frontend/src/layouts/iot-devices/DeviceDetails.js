import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import DeviceStatusBadge from "components/IoTDevices/DeviceStatusBadge";
import deviceService from "services/deviceService";

function DeviceDetails() {
	const { deviceId } = useParams();
	const navigate = useNavigate();
	const [device, setDevice] = useState(null);
	const [deviceStatus, setDeviceStatus] = useState(null);
	const [diagnostics, setDiagnostics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchDeviceDetails = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await deviceService.getDeviceById(deviceId);
			setDevice(response.device);
		} catch (err) {
			console.error("Error fetching device details:", err);
			setError(err.message || "Failed to fetch device details");
		} finally {
			setLoading(false);
		}
	}, [deviceId]);

	const fetchDeviceStatus = useCallback(async () => {
		try {
			const response = await deviceService.getDeviceStatus(deviceId);
			setDeviceStatus(response);
		} catch (err) {
			console.error("Error fetching device status:", err);
		}
	}, [deviceId]);

	const fetchDeviceDiagnostics = useCallback(async () => {
		try {
			const response = await deviceService.getDeviceDiagnostics(deviceId);
			setDiagnostics(response);
		} catch (err) {
			console.error("Error fetching device diagnostics:", err);
		}
	}, [deviceId]);

	useEffect(() => {
		if (deviceId) {
			fetchDeviceDetails();
			fetchDeviceStatus();
			fetchDeviceDiagnostics();
		}
	}, [
		deviceId,
		fetchDeviceDetails,
		fetchDeviceStatus,
		fetchDeviceDiagnostics,
	]);

	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	const handleBackToDashboard = () => {
		navigate("/iot-devices");
	};

	const handleViewTelemetry = () => {
		navigate(`/iot-devices/${deviceId}/telemetry`);
	};

	const handleSendCommand = () => {
		navigate(`/iot-devices/${deviceId}/commands`);
	};

	if (loading) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<MDBox pt={6} pb={3}>
					<MDBox textAlign="center" py={6}>
						<MDTypography variant="h6" color="text">
							Loading device details...
						</MDTypography>
					</MDBox>
				</MDBox>
				<Footer />
			</DashboardLayout>
		);
	}

	if (error || !device) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<MDBox pt={6} pb={3}>
					<Alert severity="error" sx={{ mb: 2 }}>
						{error || "Device not found"}
					</Alert>
					<Button
						variant="contained"
						color="info"
						onClick={handleBackToDashboard}
					>
						Back to Dashboard
					</Button>
				</MDBox>
				<Footer />
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<DashboardNavbar />
			<MDBox pt={6} pb={3}>
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
									Device Details
								</MDTypography>
								<MDBox display="flex" gap={1}>
									<Button
										variant="contained"
										color="white"
										size="small"
										onClick={handleViewTelemetry}
										sx={{
											backgroundColor: "white",
											color: "info.main",
											"&:hover": {
												backgroundColor: "grey.100",
											},
										}}
									>
										View Telemetry
									</Button>
									<Button
										variant="contained"
										color="white"
										size="small"
										onClick={handleSendCommand}
										sx={{
											backgroundColor: "white",
											color: "info.main",
											"&:hover": {
												backgroundColor: "grey.100",
											},
										}}
									>
										Send Command
									</Button>
									<Button
										variant="outlined"
										size="small"
										onClick={handleBackToDashboard}
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
										Back to Dashboard
									</Button>
								</MDBox>
							</MDBox>

							<MDBox p={3}>
								<Grid container spacing={3}>
									<Grid item xs={12} md={6}>
										<MDTypography
											variant="h6"
											fontWeight="medium"
											mb={2}
										>
											Device Information
										</MDTypography>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Device ID:
											</MDTypography>
											<MDTypography
												variant="body2"
												color="text"
											>
												{device.device_id}
											</MDTypography>
										</MDBox>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Device Type:
											</MDTypography>
											<MDTypography
												variant="body2"
												color="text"
											>
												{device.device_type || "N/A"}
											</MDTypography>
										</MDBox>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Status:
											</MDTypography>
											<MDBox mt={0.5}>
												<DeviceStatusBadge
													status={device.status}
												/>
											</MDBox>
										</MDBox>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Car ID:
											</MDTypography>
											<MDTypography
												variant="body2"
												color="text"
											>
												{device.car_id || "N/A"}
											</MDTypography>
										</MDBox>
										{device.make && (
											<MDBox mb={2}>
												<MDTypography
													variant="caption"
													color="text"
													fontWeight="bold"
												>
													Car:
												</MDTypography>
												<MDTypography
													variant="body2"
													color="text"
												>
													{device.make} {device.model}{" "}
													({device.year})
												</MDTypography>
											</MDBox>
										)}
									</Grid>

									<Grid item xs={12} md={6}>
										<MDTypography
											variant="h6"
											fontWeight="medium"
											mb={2}
										>
											Technical Details
										</MDTypography>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Firmware Version:
											</MDTypography>
											<MDTypography
												variant="body2"
												color="text"
											>
												{device.firmware_version ||
													"N/A"}
											</MDTypography>
										</MDBox>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Registered At:
											</MDTypography>
											<MDTypography
												variant="body2"
												color="text"
											>
												{formatDate(
													device.registered_at
												)}
											</MDTypography>
										</MDBox>
										<MDBox mb={2}>
											<MDTypography
												variant="caption"
												color="text"
												fontWeight="bold"
											>
												Last Heartbeat:
											</MDTypography>
											<MDTypography
												variant="body2"
												color="text"
											>
												{formatDate(
													device.last_heartbeat
												)}
											</MDTypography>
										</MDBox>
										{device.last_firmware_update && (
											<MDBox mb={2}>
												<MDTypography
													variant="caption"
													color="text"
													fontWeight="bold"
												>
													Last Firmware Update:
												</MDTypography>
												<MDTypography
													variant="body2"
													color="text"
												>
													{formatDate(
														device.last_firmware_update
													)}
												</MDTypography>
											</MDBox>
										)}
									</Grid>
								</Grid>

								<Divider sx={{ my: 3 }} />

								{deviceStatus && (
									<>
										<MDTypography
											variant="h6"
											fontWeight="medium"
											mb={2}
										>
											Connection Status
										</MDTypography>
										<Grid container spacing={2}>
											<Grid item xs={12} md={6}>
												<MDBox mb={2}>
													<MDTypography
														variant="caption"
														color="text"
														fontWeight="bold"
													>
														Current Status:
													</MDTypography>
													<MDBox mt={0.5}>
														<DeviceStatusBadge
															status={
																deviceStatus.status
															}
														/>
													</MDBox>
												</MDBox>
											</Grid>
											<Grid item xs={12} md={6}>
												<MDBox mb={2}>
													<MDTypography
														variant="caption"
														color="text"
														fontWeight="bold"
													>
														Last Seen:
													</MDTypography>
													<MDTypography
														variant="body2"
														color="text"
													>
														{formatDate(
															deviceStatus.last_heartbeat
														)}
													</MDTypography>
												</MDBox>
											</Grid>
										</Grid>
										<Divider sx={{ my: 3 }} />
									</>
								)}

								{diagnostics && diagnostics.health_metrics && (
									<>
										<MDTypography
											variant="h6"
											fontWeight="medium"
											mb={2}
										>
											Health Metrics
										</MDTypography>
										<Grid container spacing={2}>
											{diagnostics.health_metrics
												.battery_level !== null && (
												<Grid item xs={12} md={4}>
													<MDBox mb={2}>
														<MDTypography
															variant="caption"
															color="text"
															fontWeight="bold"
														>
															Battery Level:
														</MDTypography>
														<MDTypography
															variant="body2"
															color="text"
														>
															{
																diagnostics
																	.health_metrics
																	.battery_level
															}
															%
														</MDTypography>
													</MDBox>
												</Grid>
											)}
											{diagnostics.health_metrics
												.signal_strength !== null && (
												<Grid item xs={12} md={4}>
													<MDBox mb={2}>
														<MDTypography
															variant="caption"
															color="text"
															fontWeight="bold"
														>
															Signal Strength:
														</MDTypography>
														<MDTypography
															variant="body2"
															color="text"
														>
															{
																diagnostics
																	.health_metrics
																	.signal_strength
															}{" "}
															dBm
														</MDTypography>
													</MDBox>
												</Grid>
											)}
											{diagnostics.health_metrics
												.temperature !== null && (
												<Grid item xs={12} md={4}>
													<MDBox mb={2}>
														<MDTypography
															variant="caption"
															color="text"
															fontWeight="bold"
														>
															Temperature:
														</MDTypography>
														<MDTypography
															variant="body2"
															color="text"
														>
															{
																diagnostics
																	.health_metrics
																	.temperature
															}
															°C
														</MDTypography>
													</MDBox>
												</Grid>
											)}
										</Grid>
									</>
								)}
							</MDBox>
						</Card>
					</Grid>
				</Grid>
			</MDBox>
			<Footer />
		</DashboardLayout>
	);
}

export default DeviceDetails;
