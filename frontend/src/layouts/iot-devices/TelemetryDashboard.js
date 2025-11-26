import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import TelemetryChart from "components/IoTDevices/TelemetryChart";
import TelemetryMetricCard from "components/IoTDevices/TelemetryMetricCard";
import telemetryService from "services/telemetryService";
import deviceService from "services/deviceService";

function TelemetryDashboard() {
	const { deviceId } = useParams();
	const navigate = useNavigate();
	const [device, setDevice] = useState(null);
	const [telemetryData, setTelemetryData] = useState([]);
	const [chartData, setChartData] = useState({
		labels: [],
		batteryData: [],
		temperatureData: [],
		signalStrengthData: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const fetchDeviceInfo = useCallback(async () => {
		try {
			const response = await deviceService.getDeviceById(deviceId);
			setDevice(response.device);
		} catch (err) {
			console.error("Error fetching device info:", err);
		}
	}, [deviceId]);

	const fetchTelemetryData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await telemetryService.getTelemetryData(deviceId, {
				limit: 50,
			});

			const data = response.telemetry || [];
			setTelemetryData(data);

			const formatted = telemetryService.formatTelemetryForChart(data);
			setChartData(formatted);
		} catch (err) {
			console.error("Error fetching telemetry data:", err);
			setError(err.message || "Failed to fetch telemetry data");
			setTelemetryData([]);
			setChartData({
				labels: [],
				batteryData: [],
				temperatureData: [],
				signalStrengthData: [],
			});
		} finally {
			setLoading(false);
		}
	}, [deviceId]);

	useEffect(() => {
		if (deviceId) {
			fetchDeviceInfo();
			fetchTelemetryData();
		}
	}, [deviceId, fetchDeviceInfo, fetchTelemetryData]);

	const handleBackToDevice = () => {
		navigate(`/iot-devices/${deviceId}`);
	};

	const handleBackToDashboard = () => {
		navigate("/iot-devices");
	};

	const getLatestMetric = (dataArray) => {
		if (!dataArray || dataArray.length === 0) return null;
		return dataArray[dataArray.length - 1];
	};

	const latestData =
		telemetryData.length > 0
			? telemetryData[telemetryData.length - 1]
			: null;

	if (loading && telemetryData.length === 0) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<MDBox pt={6} pb={3}>
					<MDBox textAlign="center" py={6}>
						<MDTypography variant="h6" color="text">
							Loading telemetry data...
						</MDTypography>
					</MDBox>
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
								<MDBox>
									<MDTypography variant="h6" color="white">
										Telemetry Dashboard
									</MDTypography>
									{device && (
										<MDTypography
											variant="caption"
											color="white"
											opacity={0.8}
										>
											Device: {device.device_id} (
											{device.device_type})
										</MDTypography>
									)}
								</MDBox>
								<MDBox display="flex" gap={1}>
									<Button
										variant="contained"
										color="white"
										size="small"
										onClick={handleBackToDevice}
										sx={{
											backgroundColor: "white",
											color: "info.main",
											"&:hover": {
												backgroundColor: "grey.100",
											},
										}}
									>
										Device Details
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
										Dashboard
									</Button>
								</MDBox>
							</MDBox>

							<MDBox p={3}>
								{error && (
									<Alert severity="error" sx={{ mb: 3 }}>
										{error}
									</Alert>
								)}

								<Grid container spacing={3} mb={3}>
									<Grid item xs={12} md={4}>
										<TelemetryMetricCard
											title="Battery Level"
											value={latestData?.battery_level}
											unit="%"
											color="success"
										/>
									</Grid>
									<Grid item xs={12} md={4}>
										<TelemetryMetricCard
											title="Temperature"
											value={latestData?.temperature}
											unit="°C"
											color="warning"
										/>
									</Grid>
									<Grid item xs={12} md={4}>
										<TelemetryMetricCard
											title="Signal Strength"
											value={latestData?.signal_strength}
											unit="dBm"
											color="info"
										/>
									</Grid>
								</Grid>

								{telemetryData.length === 0 ? (
									<MDBox py={6} textAlign="center">
										<MDTypography
											variant="body2"
											color="text"
										>
											No telemetry data available for this
											device yet.
										</MDTypography>
										<MDTypography
											variant="caption"
											color="text"
											display="block"
											mt={1}
										>
											Telemetry data will appear here once
											the device starts sending data.
										</MDTypography>
									</MDBox>
								) : (
									<Grid container spacing={3}>
										{chartData.batteryData.length > 0 && (
											<Grid item xs={12} lg={6}>
												<TelemetryChart
													title="Battery Level Over Time"
													labels={chartData.labels}
													datasets={[
														{
															label: "Battery (%)",
															data: chartData.batteryData,
														},
													]}
													color="rgb(75, 192, 192)"
												/>
											</Grid>
										)}

										{chartData.temperatureData.length >
											0 && (
											<Grid item xs={12} lg={6}>
												<TelemetryChart
													title="Temperature Over Time"
													labels={chartData.labels}
													datasets={[
														{
															label: "Temperature (°C)",
															data: chartData.temperatureData,
														},
													]}
													color="rgb(255, 159, 64)"
												/>
											</Grid>
										)}

										{chartData.signalStrengthData.length >
											0 && (
											<Grid item xs={12} lg={6}>
												<TelemetryChart
													title="Signal Strength Over Time"
													labels={chartData.labels}
													datasets={[
														{
															label: "Signal Strength (dBm)",
															data: chartData.signalStrengthData,
														},
													]}
													color="rgb(54, 162, 235)"
												/>
											</Grid>
										)}
									</Grid>
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

export default TelemetryDashboard;
