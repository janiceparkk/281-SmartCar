import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
	Box,
	Grid,
	Card,
	CardContent,
	CardHeader,
	Typography,
	Chip,
	Avatar,
	LinearProgress,
	Container,
	IconButton,
	Tooltip,
	Alert,
	Button,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
} from "@mui/material";
import {
	DirectionsCar as CarIcon,
	Refresh as RefreshIcon,
	Speed as SpeedIcon,
	LocationOn as LocationIcon,
	Warning as WarningIcon,
	Add as AddIcon,
	Delete as DeleteIcon,
} from "@mui/icons-material";

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const CARLA_BRIDGE_URL =
	process.env.REACT_APP_CARLA_BRIDGE_URL || "http://localhost:5001";

const CARLA_MODELS = [
	{ label: "Tesla Model 3", value: "vehicle.tesla.model3" },
	{ label: "Audi A2", value: "vehicle.audi.a2" },
	{ label: "Mustang", value: "vehicle.ford.mustang" },
	{ label: "Police Car", value: "vehicle.chevrolet.impala" },
	{ label: "Bicycle", value: "vehicle.bh.crossbike" },
];
const CarlaDashboard = () => {
	const { carId } = useParams(); // Get carId from URL params
	const [cars, setCars] = useState([]);
	const [selectedCar, setSelectedCar] = useState(null);
	const [telemetryData, setTelemetryData] = useState({});
	const [error, setError] = useState(null);
	const [connectionStatus, setConnectionStatus] = useState("disconnected");
	const [addCarDialogOpen, setAddCarDialogOpen] = useState(false);
	const [newCarId, setNewCarId] = useState("");
	const [newCarModel, setNewCarModel] = useState("vehicle.tesla.model3");

	const [newCarLat, setNewCarLat] = useState("");
	const [newCarLon, setNewCarLon] = useState("");
	const [snackbar, setSnackbar] = useState({
		open: false,
		message: "",
		severity: "success",
	});
	const videoRefs = useRef({});

	const getAuthToken = () => {
		return localStorage.getItem("token");
	};

	const testConnection = async () => {
		try {
			const response = await fetch(`${CARLA_BRIDGE_URL}/health`);
			if (response.ok) {
				setConnectionStatus("connected");
				setError(null);
				return true;
			}
		} catch (err) {
			// silent fail for polling
		}
		setConnectionStatus("error");
		setError(
			"Cannot connect to CARLA bridge server. Make sure it's running on port 5001."
		);
		return false;
	};

	// Fetch car list and manage selection - now user-based
	const fetchCarList = async () => {
		try {
			setError(null);

			const token = getAuthToken();
			if (!token) {
				setError("Authentication required. Please log in.");
				setConnectionStatus("error");
				return;
			}

			// Test CARLA bridge connection first
			const isConnected = await testConnection();
			if (!isConnected) return;

			// Fetch user's cars from backend API (which maps with CARLA)
			const response = await fetch(`${API_URL}/api/cars/carla`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				if (response.status === 401) {
					setError("Authentication failed. Please log in again.");
					setConnectionStatus("error");
					return;
				}
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}`
				);
			}

			const carList = await response.json();
			// Extract carla_car_id from each car object for compatibility
			const carlaCarIds = carList.map(
				(car) => car.carla_car_id || car.license_plate
			);
			setCars(carList); // Store full car objects

			// *** FIXED SELECTION LOGIC WITH URL PARAM SUPPORT ***
			if (carList.length > 0) {
				// Priority 1: If carId is provided in URL, try to select that car
				if (carId) {
					const carFromUrl = carList.find(
						(car) =>
							car.license_plate === carId ||
							car.carla_car_id === carId ||
							car.car_id?.toString() === carId
					);
					if (carFromUrl) {
						setSelectedCar(carFromUrl);
						return; // Exit early if we found the car from URL
					}
				}

				// Priority 2: If current selection is valid, keep it.
				const currentCarId =
					selectedCar?.carla_car_id ||
					selectedCar?.license_plate ||
					selectedCar;
				if (selectedCar && carlaCarIds.includes(currentCarId)) {
					// Selection preserved.
				} else {
					// Priority 3: Auto-select the first car if none selected or the selected one was removed.
					setSelectedCar(carList[0]);
				}
			} else {
				// Clear selection if no cars remain.
				setSelectedCar(null);
			}
			// ****************************
		} catch (error) {
			setError(`Failed to fetch vehicles: ${error.message}`);
			setConnectionStatus("error");
		}
	};

	// Fetch telemetry data for selected car
	const fetchTelemetry = async (car) => {
		try {
			// Get CARLA car_id from car object
			const carlaCarId = car?.carla_car_id || car?.license_plate || car;
			if (!carlaCarId) return;

			const response = await fetch(
				`${CARLA_BRIDGE_URL}/telemetry/${carlaCarId}`
			);
			if (!response.ok) return;

			const data = await response.json();
			// Use carla_car_id as key for telemetry data
			setTelemetryData((prev) => ({
				...prev,
				[carlaCarId]: data.telemetry,
			}));
		} catch (error) {
			// silent fail for polling
		}
	};

	// Set up video stream
	const setupVideoStream = (car) => {
		// Get CARLA car_id from car object
		const carlaCarId = car?.carla_car_id || car?.license_plate || car;
		if (!carlaCarId) return;

		const videoElement = videoRefs.current[carlaCarId];
		if (videoElement) {
			videoElement.src = `${CARLA_BRIDGE_URL}/video-stream/${carlaCarId}`;
		}
	};

	// Add new car manually
	const addNewCar = async () => {
		if (!newCarId.trim() || !newCarModel.trim()) {
			showSnackbar(
				"Please enter both a Car ID and select a Model",
				"error"
			);
			return;
		}

		// Basic validation for numbers
		if (isNaN(parseFloat(newCarLat)) || isNaN(parseFloat(newCarLon))) {
			showSnackbar(
				"Latitude and Longitude must be valid numbers.",
				"error"
			);
			return;
		}

		try {
			const token = getAuthToken();
			if (!token) {
				showSnackbar(
					"Authentication required. Please log in.",
					"error"
				);
				return;
			}

			// First, add car to CARLA bridge
			const carlaResponse = await fetch(`${CARLA_BRIDGE_URL}/add-car`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					car_id: newCarId.trim(),
					model_name: newCarModel.trim(),
					lat: parseFloat(newCarLat), // Send as float
					lon: parseFloat(newCarLon), // Send as float
				}),
			});

			if (!carlaResponse.ok) {
				const errorData = await carlaResponse.json();
				throw new Error(
					errorData.error || `HTTP ${carlaResponse.status}`
				);
			}

			// Then, register the car in PostgreSQL with license_plate set to CARLA car_id
			const dbResponse = await fetch(`${API_URL}/api/cars`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					model: newCarModel.trim(),
					license_plate: newCarId.trim(), // Use license_plate to store CARLA car_id
					status: "active",
				}),
			});

			if (!dbResponse.ok) {
				// If DB registration fails, we still have the car in CARLA
				// but warn the user
				const errorData = await dbResponse.json();
				showSnackbar(
					`Car added to CARLA but database registration failed: ${errorData.message}`,
					"warning"
				);
			} else {
				showSnackbar("Car added successfully", "success");
			}

			setAddCarDialogOpen(false);

			// Reset fields
			setNewCarId("");
			setNewCarModel(CARLA_MODELS[0].value);
			setNewCarLat("");
			setNewCarLon("");

			setTimeout(fetchCarList, 2000);
		} catch (error) {
			showSnackbar(`Failed to add car: ${error.message}`, "error");
		}
	};

	// Remove car
	const removeCar = async (car) => {
		try {
			// Get CARLA car_id from car object
			const carlaCarId = car?.carla_car_id || car?.license_plate || car;
			if (!carlaCarId) {
				showSnackbar("Invalid car identifier", "error");
				return;
			}

			// Remove from CARLA bridge
			const carlaResponse = await fetch(
				`${CARLA_BRIDGE_URL}/remove-car/${carlaCarId}`,
				{
					method: "POST",
				}
			);

			if (!carlaResponse.ok) {
				const errorData = await carlaResponse.json();
				throw new Error(
					errorData.error || `HTTP ${carlaResponse.status}`
				);
			}

			showSnackbar("Car removed from CARLA successfully", "success");

			// Refresh car list
			setTimeout(fetchCarList, 1000);
		} catch (error) {
			showSnackbar(`Failed to remove car: ${error.message}`, "error");
		}
	};

	// Show snackbar notification
	const showSnackbar = (message, severity = "success") => {
		setSnackbar({ open: true, message, severity });
	};

	useEffect(() => {
		// Initial fetch and polling for car list (every 3 seconds)
		fetchCarList();
		const carListInterval = setInterval(fetchCarList, 3000);

		return () => {
			clearInterval(carListInterval);
		};
	}, [selectedCar, carId]); // Include selectedCar and carId to re-fetch when URL param changes

	useEffect(() => {
		let telemetryInterval;
		if (selectedCar) {
			// Set up telemetry polling for selected car (every second)
			telemetryInterval = setInterval(() => {
				fetchTelemetry(selectedCar);
			}, 1000);

			// Set up video stream
			setupVideoStream(selectedCar);
		}

		return () => {
			clearInterval(telemetryInterval);
		};
	}, [selectedCar]);

	const getStatusColor = (speed) => {
		if (speed > 50) return "error";
		if (speed > 30) return "warning";
		return "success";
	};

	const getStatusText = (speed) => {
		if (speed > 50) return "High Speed";
		if (speed > 30) return "Moderate Speed";
		return "Normal";
	};

	const getConnectionStatusColor = () => {
		switch (connectionStatus) {
			case "connected":
				return "success";
			case "error":
				return "error";
			default:
				return "warning";
		}
	};

	const getConnectionStatusText = () => {
		switch (connectionStatus) {
			case "connected":
				return `Connected (${cars.length} vehicles)`;
			case "error":
				return "Connection Failed";
			default:
				return "Connecting...";
		}
	};

	return (
		<Container maxWidth="xl" sx={{ py: 4 }}>
			{/* Header */}
			<Box sx={{ mb: 4 }}>
				<Typography variant="h4" gutterBottom>
					CARLA Simulation Dashboard
				</Typography>
				<Typography variant="body1" color="textSecondary">
					Real-time monitoring and control of autonomous vehicles
				</Typography>

				{/* Connection Status */}
				<Box
					sx={{
						mt: 2,
						display: "flex",
						gap: 2,
						alignItems: "center",
					}}
				>
					<Chip
						label={getConnectionStatusText()}
						color={getConnectionStatusColor()}
						icon={
							connectionStatus === "error" ? (
								<WarningIcon />
							) : (
								<CarIcon />
							)
						}
					/>
					<Button
						variant="text"
						startIcon={<AddIcon />}
						onClick={() => setAddCarDialogOpen(true)}
					>
						Add Car
					</Button>
				</Box>
			</Box>

			{/* Error Alert */}
			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			{/* Vehicle Selection Card */}
			<Card sx={{ mb: 4 }}>
				<CardHeader
					title="Active Vehicles"
					action={
						<Tooltip title="Refresh Vehicle List">
							<IconButton onClick={fetchCarList}>
								<RefreshIcon />
							</IconButton>
						</Tooltip>
					}
				/>
				<CardContent>
					{cars.length > 0 ? (
						<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
							{cars.map((car) => {
								const carlaCarId =
									car.carla_car_id || car.license_plate;
								const carDisplayName =
									car.model ||
									car.license_plate ||
									carlaCarId ||
									"Unknown Car";
								const isSelected =
									selectedCar?.car_id === car.car_id ||
									selectedCar?.carla_car_id === carlaCarId ||
									selectedCar?.license_plate ===
										car.license_plate;

								return (
									<Card
										key={car.car_id || carlaCarId}
										sx={{
											minWidth: 200,
											cursor: "pointer",
											border: isSelected ? 2 : 1,
											borderColor: isSelected
												? "primary.main"
												: "divider",
											"&:hover": {
												boxShadow: 2,
											},
										}}
										onClick={() => setSelectedCar(car)}
									>
										<CardContent>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													mb: 2,
												}}
											>
												<Avatar
													sx={{
														bgcolor: "primary.main",
														mr: 2,
													}}
												>
													<CarIcon />
												</Avatar>
												<Box sx={{ flexGrow: 1 }}>
													<Typography variant="h6">
														{carDisplayName}
													</Typography>
													<Typography
														variant="body2"
														color="textSecondary"
													>
														Speed:{" "}
														{telemetryData[
															carlaCarId
														]?.speed || 0}{" "}
														km/h
													</Typography>
												</Box>
												<Tooltip title="Remove Car">
													<IconButton
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															removeCar(car);
														}}
														color="error"
													>
														<DeleteIcon />
													</IconButton>
												</Tooltip>
											</Box>
											<Box
												sx={{ display: "flex", gap: 1 }}
											>
												<Chip
													label={getStatusText(
														telemetryData[
															carlaCarId
														]?.speed || 0
													)}
													color={getStatusColor(
														telemetryData[
															carlaCarId
														]?.speed || 0
													)}
													size="small"
												/>
												<Button
													size="small"
													variant={"contained"}
													color="primary"
													onClick={() =>
														setSelectedCar(car)
													}
													sx={{
														color: "#000000",

														...(isSelected && {
															backgroundColor:
																"primary.main",
															"&:hover": {
																backgroundColor:
																	"primary.dark",
															},
														}),
													}}
												>
													{isSelected
														? "Selected"
														: "Select"}
												</Button>
											</Box>
										</CardContent>
									</Card>
								);
							})}
						</Box>
					) : (
						<Box sx={{ textAlign: "center", py: 4 }}>
							<WarningIcon
								sx={{
									fontSize: 48,
									color: "text.secondary",
									mb: 2,
								}}
							/>
							<Typography
								variant="h6"
								color="textSecondary"
								gutterBottom
							>
								No vehicles connected
							</Typography>
							<Typography variant="body2" color="textSecondary">
								Click "Add Car" to start monitoring a vehicle
							</Typography>
						</Box>
					)}
				</CardContent>
			</Card>

			{selectedCar &&
				(() => {
					const carlaCarId =
						selectedCar?.carla_car_id ||
						selectedCar?.license_plate ||
						selectedCar;
					const carDisplayName =
						selectedCar?.model ||
						selectedCar?.license_plate ||
						carlaCarId ||
						"Unknown Car";
					const telemetry = telemetryData[carlaCarId];

					return (
						<Grid container spacing={3}>
							{/* Video Stream */}
							<Grid item xs={12} md={8}>
								<Card sx={{ height: "100%" }}>
									<CardHeader
										title={`Live Camera Feed - ${carDisplayName}`}
										action={
											<Chip
												label="LIVE"
												color="error"
												size="small"
											/>
										}
									/>
									<CardContent>
										<Box
											sx={{
												position: "relative",
												width: "100%",
												height: "400px",
												bgcolor: "black",
												borderRadius: 1,
												overflow: "hidden",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<img
												ref={(el) =>
													(videoRefs.current[
														carlaCarId
													] = el)
												}
												alt={`Live feed from ${carDisplayName}`}
												style={{
													width: "100%",
													height: "100%",
													objectFit: "cover",
												}}
												onError={() => {
													// Handle image load error silently or with a placeholder
												}}
											/>
											{!telemetry && (
												<Typography
													position="absolute"
													color="white"
													variant="h6"
												>
													Waiting for video stream
													from {carDisplayName}...
												</Typography>
											)}
										</Box>
									</CardContent>
								</Card>
							</Grid>

							{/* Telemetry Data */}
							<Grid item xs={12} md={4}>
								<Card sx={{ mb: 3 }}>
									<CardHeader
										title="Vehicle Telemetry"
										action={
											<Chip
												label={getStatusText(
													telemetry?.speed || 0
												)}
												color={getStatusColor(
													telemetry?.speed || 0
												)}
											/>
										}
									/>
									<CardContent>
										<Box sx={{ mb: 3 }}>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													mb: 1,
												}}
											>
												<SpeedIcon
													color="primary"
													sx={{ mr: 1 }}
												/>
												<Typography
													variant="body2"
													color="textSecondary"
												>
													Current Speed
												</Typography>
											</Box>
											<Typography
												variant="h4"
												color="primary"
												gutterBottom
											>
												{telemetry?.speed || 0} km/h
											</Typography>
											<LinearProgress
												variant="determinate"
												value={Math.min(
													((telemetry?.speed || 0) /
														100) *
														100,
													100
												)}
												sx={{
													height: 8,
													borderRadius: 4,
													mb: 1,
												}}
											/>
										</Box>

										<Box sx={{ mb: 2 }}>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													mb: 1,
												}}
											>
												<LocationIcon
													color="secondary"
													sx={{ mr: 1 }}
												/>
												<Typography
													variant="body2"
													color="textSecondary"
												>
													Location Coordinates
												</Typography>
											</Box>
											<Grid container spacing={2}>
												<Grid item xs={6}>
													<Typography
														variant="body2"
														color="textSecondary"
													>
														Latitude
													</Typography>
													<Typography
														variant="h6"
														fontFamily="monospace"
													>
														{telemetry?.lat?.toFixed(
															6
														) || "0.000000"}
													</Typography>
												</Grid>
												<Grid item xs={6}>
													<Typography
														variant="body2"
														color="textSecondary"
													>
														Longitude
													</Typography>
													<Typography
														variant="h6"
														fontFamily="monospace"
													>
														{telemetry?.lon?.toFixed(
															6
														) || "0.000000"}
													</Typography>
												</Grid>
											</Grid>
										</Box>

										<Box>
											<Typography
												variant="body2"
												color="textSecondary"
												gutterBottom
											>
												Last Updated
											</Typography>
											<Typography variant="body2">
												{telemetry?.timestamp
													? new Date(
															telemetry.timestamp *
																1000
													  ).toLocaleTimeString()
													: "Never"}
											</Typography>
										</Box>
									</CardContent>
								</Card>

								{/* Quick Actions */}
								<Card>
									<CardHeader title="Quick Actions" />
									<CardContent>
										<Box
											sx={{
												display: "flex",
												gap: 1,
												flexWrap: "wrap",
											}}
										>
											<Button
												sx={{
													color: "#000000",
												}}
												color="primary"
												variant="contained"
												startIcon={<RefreshIcon />}
												onClick={fetchCarList}
											>
												Refresh
											</Button>
											<Button
												variant="contained"
												sx={{
													color: "#000000",
												}}
												color="error"
												startIcon={<DeleteIcon />}
												onClick={() =>
													removeCar(selectedCar)
												}
											>
												Remove Car
											</Button>
										</Box>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					);
				})()}

			{/* Add Car Dialog */}
			<Dialog
				open={addCarDialogOpen}
				onClose={() => setAddCarDialogOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Add New Car</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Car ID (Unique Name)"
						type="text"
						fullWidth
						variant="outlined"
						value={newCarId}
						onChange={(e) => setNewCarId(e.target.value)}
						placeholder="e.g., CAR2000"
						helperText="Enter a unique identifier for the vehicle"
						sx={{ mb: 3 }}
					/>

					<FormControl fullWidth sx={{ mb: 3 }}>
						<InputLabel id="car-model-label">Car Model</InputLabel>
						<Select
							size="large"
							labelId="car-model-label"
							id="car-model-select"
							value={newCarModel}
							label="Car Model"
							onChange={(e) => setNewCarModel(e.target.value)}
						>
							{CARLA_MODELS.map((model) => (
								<MenuItem key={model.value} value={model.value}>
									{model.label} (
									{model.value.split(".").pop()})
								</MenuItem>
							))}
						</Select>
						<Typography
							variant="caption"
							color="textSecondary"
							sx={{ mt: 1, display: "block" }}
						>
							Select the CARLA blueprint for the new vehicle.
						</Typography>
					</FormControl>

					<Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>
						Initial Spawn Location
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<TextField
								margin="dense"
								label="Latitude (Y)"
								type="number"
								fullWidth
								variant="outlined"
								value={newCarLat}
								onChange={(e) => setNewCarLat(e.target.value)}
								placeholder="e.g., 205.00"
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								margin="dense"
								label="Longitude (X)"
								type="number"
								fullWidth
								variant="outlined"
								value={newCarLon}
								onChange={(e) => setNewCarLon(e.target.value)}
								placeholder="e.g., 15.00"
							/>
						</Grid>
					</Grid>
					<Typography
						variant="caption"
						color="textSecondary"
						sx={{ mt: 1, display: "block" }}
					>
						Note: This is the CARLA map coordinate system (X, Y, Z
						are handled by backend).
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddCarDialogOpen(false)}>
						Cancel
					</Button>
					<Button
						onClick={addNewCar}
						variant="contained"
						disabled={!newCarId.trim()}
					>
						Add Car
					</Button>
				</DialogActions>
			</Dialog>

			{/* Snackbar for notifications */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
				message={snackbar.message}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			/>
		</Container>
	);
};

export default CarlaDashboard;
