import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
} from "react";
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
	CircularProgress,
	Autocomplete,
} from "@mui/material";
import {
	DirectionsCar as CarIcon,
	Refresh as RefreshIcon,
	Speed as SpeedIcon,
	LocationOn as LocationIcon,
	Add as AddIcon,
	Delete as DeleteIcon,
	Edit as EditIcon,
	VideocamOff as VideocamOffIcon,
	CloudOff as CloudOffIcon,
} from "@mui/icons-material";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { Skeleton } from "@mui/material";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const CARLA_BRIDGE_URL =
	process.env.REACT_APP_CARLA_BRIDGE_URL || "http://localhost:5001";
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
const CAR_STATUSES = [
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
	{ label: "Maintenance", value: "maintenance" },
];
const CARLA_MODELS = [
	{ label: "Tesla Model 3", value: "vehicle.tesla.model3" },
	{ label: "Audi A2", value: "vehicle.audi.a2" },
	{ label: "Mustang", value: "vehicle.ford.mustang" },
	{ label: "Police Car", value: "vehicle.chevrolet.impala" },
	{ label: "Bicycle", value: "vehicle.bh.crossbike" },
];

const CarListItem = React.memo(
	({ car, isSelected, telemetry, onSelect, onRemove, onEdit }) => {
		const carlaCarId = car.carla_car_id || car.license_plate;
		const carDisplayName =
			car.model ||
			car.make ||
			car.license_plate ||
			car.carla_car_id ||
			`Car #${car.car_id}`;
		const speed = telemetry?.speed || 0;

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

		return (
			<Card
				sx={{
					minWidth: 200,
					cursor: "pointer",
					border: isSelected ? 2 : 1,
					borderColor: isSelected ? "primary.main" : "divider",
					"&:hover": { boxShadow: 2 },
				}}
				onClick={() => onSelect(car)}
			>
				<CardContent>
					<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
						<Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
							<CarIcon />
						</Avatar>
						<Box sx={{ flexGrow: 1 }}>
							<Typography variant="h6">
								{carDisplayName}
							</Typography>
							<Typography variant="body2" color="textSecondary">
								{car.is_active_in_carla
									? `Speed: ${speed} km/h`
									: "Offline"}
							</Typography>
						</Box>
						<Tooltip title="Remove Car">
							<IconButton
								size="small"
								onClick={(e) => {
									e.stopPropagation();
									onRemove(car);
								}}
								color="error"
							>
								<DeleteIcon />
							</IconButton>
						</Tooltip>
					</Box>
					<Box sx={{ display: "flex", gap: 1 }}>
						{car.is_active_in_carla && (
							<Chip
								label={getStatusText(speed)}
								color={getStatusColor(speed)}
								size="small"
							/>
						)}
						<Chip
							label={
								car.status === "active"
									? "Active"
									: car.status || "Unknown"
							}
							color={
								car.status === "active" ? "success" : "default"
							}
							size="small"
							variant="outlined"
						/>
						<Button
							size="small"
							variant={isSelected ? "contained" : "outlined"}
							color="primary"
							onClick={(e) => {
								e.stopPropagation();
								onSelect(car);
							}}
							sx={{ color: isSelected ? "#fff" : "#000" }}
						>
							{isSelected ? "Selected" : "Select"}
						</Button>
					</Box>
				</CardContent>
			</Card>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.isSelected === nextProps.isSelected &&
			prevProps.telemetry?.speed === nextProps.telemetry?.speed &&
			prevProps.car.car_id === nextProps.car.car_id &&
			prevProps.car.is_active_in_carla ===
				nextProps.car.is_active_in_carla
		);
	}
);

const CarlaDashboard = () => {
	const { carId } = useParams();
	const [cars, setCars] = useState([]);
	const [selectedCar, setSelectedCar] = useState(null);
	const [telemetryData, setTelemetryData] = useState({});
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [addCarDialogOpen, setAddCarDialogOpen] = useState(false);
	const [newCarId, setNewCarId] = useState("");
	const [newCarModel, setNewCarModel] = useState("vehicle.tesla.model3");
	const [newCarLat, setNewCarLat] = useState("");
	const [newCarLon, setNewCarLon] = useState("");
	const [newCarMake, setNewCarMake] = useState("");
	const [newCarYear, setNewCarYear] = useState("");
	const [newCarVIN, setNewCarVIN] = useState("");
	const [newCarColor, setNewCarColor] = useState("");

	const [snackbar, setSnackbar] = useState({
		open: false,
		message: "",
		severity: "success",
	});
	const [editCarDialogOpen, setEditCarDialogOpen] = useState(false);
	const [editCarForm, setEditCarForm] = useState({
		make: "",
		model: "",
		year: "",
		color: "",
		status: "active",
		license_plate: "",
		current_latitude: "",
		current_longitude: "",
	});
	const [carlaAvailable, setCarlaAvailable] = useState(false);
	const videoRefs = useRef({});

	const [alerts, setAlerts] = useState([]);
	const [alertPage, setAlertPage] = useState(1);
	const [loadingAlerts, setLoadingAlerts] = useState(false);

	const [availableUsers, setAvailableUsers] = useState([]);
	const [selectedOwner, setSelectedOwner] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const fetchUsers = useCallback(async () => {
		const token = getAuthToken();
		if (!token) return;

		try {
			const response = await fetch(`${API_URL}/user`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (response.ok) {
				const data = await response.json();
				setAvailableUsers(data);
				setIsAdmin(true); // If we can fetch users, we are admin
			} else {
				// If 403, regular user, just ignore
				setIsAdmin(false);
			}
		} catch (error) {
			console.error("Failed to fetch users", error);
		}
	}, []);
	const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
		id: "google-map-script",
		googleMapsApiKey: GOOGLE_MAPS_API_KEY || "DUMMY_KEY",
	});
	const canUseMaps = Boolean(GOOGLE_MAPS_API_KEY);
	const defaultMapCenter = useMemo(
		() => ({ lat: 37.7749, lng: -122.4194 }),
		[]
	);
	const isFetching = useRef(false);

	const carlaToLatLng = (x, y, originLat, originLng) => {
		const metersPerDegreeLat = 111320;
		const metersPerDegreeLng =
			(40075000 * Math.cos((originLat * Math.PI) / 180)) / 360;

		const lat = originLat + y / metersPerDegreeLat;
		const lng = originLng + x / metersPerDegreeLng;

		return { lat, lng };
	};

	const CARLA_ORIGIN = { lat: 37.7749, lng: -122.4194 }; //  San Francisco

	// Update mapCoordinates to use the transformation
	const mapCoordinates = useMemo(() => {
		if (!selectedCar) return null;
		const carlaCarId =
			selectedCar?.carla_car_id || selectedCar?.license_plate;
		const telemetry = carlaCarId ? telemetryData[carlaCarId] : null;
		const x = telemetry?.lon ?? selectedCar.current_longitude ?? null;
		const y = telemetry?.lat ?? selectedCar.current_latitude ?? null;

		if (
			x === null ||
			y === null ||
			Number.isNaN(Number(x)) ||
			Number.isNaN(Number(y))
		) {
			return null;
		}

		// Convert CARLA coordinates to latitude and longitude
		return carlaToLatLng(
			Number(x),
			Number(y),
			CARLA_ORIGIN.lat,
			CARLA_ORIGIN.lng
		);
	}, [selectedCar, telemetryData]);

	const getAuthToken = () => localStorage.getItem("token");

	const fetchCarList = useCallback(
		async (manualRefresh = false) => {
			// Prevent overlapping fetches
			if (isFetching.current) return;
			isFetching.current = true;

			try {
				setError(null);

				if (manualRefresh) {
					setLoading(true);
				}

				const token = getAuthToken();
				if (!token) {
					setError("Authentication required. Please log in.");
					setLoading(false);
					isFetching.current = false;
					return;
				}

				let carList = [];
				let newCarlaAvailable = false;

				try {
					const controller = new AbortController();
					const timeoutId = setTimeout(
						() => controller.abort(),
						3000
					);
					const response = await fetch(`${API_URL}/cars/carla`, {
						signal: controller.signal,
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					});
					clearTimeout(timeoutId);

					if (response.ok) {
						carList = await response.json();
						if (Array.isArray(carList)) {
							newCarlaAvailable = carList.some(
								(car) =>
									car.carla_available &&
									car.is_active_in_carla
							);
						} else carList = [];
					} else throw new Error(`HTTP ${response.status}`);
				} catch (carlaError) {
					try {
						const fallbackResponse = await fetch(
							`${API_URL}/cars/user`,
							{
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
							}
						);
						if (fallbackResponse.ok) {
							const userCars = await fallbackResponse.json();
							carList = Array.isArray(userCars)
								? userCars.map((car) => ({
										...car,
										carla_car_id: car.license_plate || null,
										is_active_in_carla: false,
										carla_available: false,
								  }))
								: [];
						}
					} catch (fallbackError) {
						console.log("fallbackError", fallbackError);
					}
				}

				setCars((prevCars) =>
					JSON.stringify(prevCars) === JSON.stringify(carList)
						? prevCars
						: carList
				);

				setCarlaAvailable(newCarlaAvailable);

				if (carList.length > 0) {
					const newSelectedCar = carId
						? carList.find((car) => car.carla_car_id === carId)
						: carList[0];

					setSelectedCar((prev) =>
						prev?.car_id === newSelectedCar?.car_id
							? prev
							: newSelectedCar
					);
				} else {
					setSelectedCar(null);
				}
			} catch (error) {
				console.error("Error fetching car list:", error);
				setError(`Failed to fetch vehicles: ${error.message}`);
			} finally {
				setLoading(false);
				isFetching.current = false;
			}
		},
		[carId]
	);

	useEffect(() => {
		fetchCarList();
		fetchUsers();
		const carListInterval = setInterval(
			() => fetchCarList(),
			carlaAvailable ? 60000 : 120000
		);

		return () => clearInterval(carListInterval);
	}, [fetchCarList, carlaAvailable]);

	const fetchTelemetry = async (car) => {
		if (!car?.is_active_in_carla || !car?.carla_car_id) return;
		try {
			const carlaCarId = car.carla_car_id;
			const response = await fetch(
				`${CARLA_BRIDGE_URL}/telemetry/${carlaCarId}`,
				{ signal: AbortSignal.timeout(2000) }
			);
			if (!response.ok) return;
			const data = await response.json();
			setTelemetryData((prev) => ({
				...prev,
				[carlaCarId]: data.telemetry,
			}));
		} catch (error) {}
	};

	const setupVideoStream = (car) => {
		if (!car?.is_active_in_carla || !car?.carla_car_id) return;

		const carlaCarId = car.carla_car_id;
		const videoElement = videoRefs.current[carlaCarId];

		if (videoElement) {
			videoElement.src = `${CARLA_BRIDGE_URL}/video-stream/${carlaCarId}?t=${Date.now()}`;
		}
	};

	const addNewCar = async () => {
		if (!newCarId.trim() || !newCarModel.trim()) {
			showSnackbar(
				"Please enter both a Car ID and select a Model",
				"error"
			);
			return;
		}

		if (isAdmin && !selectedOwner) {
			showSnackbar("Please assign an owner to this vehicle.", "error");
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

			let carlaSuccess = false;
			try {
				const carlaResponse = await fetch(
					`${CARLA_BRIDGE_URL}/add-car`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							car_id: newCarId.trim(),
							model_name: newCarModel.trim(),
							lat: parseFloat(newCarLat),
							lon: parseFloat(newCarLon),
						}),
						signal: AbortSignal.timeout(3000),
					}
				);
				if (carlaResponse.ok) carlaSuccess = true;
			} catch (error) {
				console.log(
					"CARLA bridge unavailable, registering in database only"
				);
			}
			const payload = {
				model: newCarModel.trim(),
				license_plate: newCarId.trim(),
				status: "active",
				current_latitude: parseFloat(newCarLat) || 0,
				current_longitude: parseFloat(newCarLon) || 0,
				user_id:
					isAdmin && selectedOwner
						? selectedOwner.user_id
						: undefined,

				make: newCarMake.trim(),
				year: parseInt(newCarYear, 10) || null,
				vin: newCarVIN.trim(),
				color: newCarColor.trim(),
			};
			const dbResponse = await fetch(`${API_URL}/cars`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});

			if (!dbResponse.ok) {
				const errorData = await dbResponse.json();
				throw new Error(errorData.message || "Failed to register car");
			}

			if (carlaSuccess)
				showSnackbar(
					"Car added successfully to CARLA and database",
					"success"
				);
			else
				showSnackbar(
					"Car registered in database. CARLA bridge unavailable.",
					"warning"
				);

			setAddCarDialogOpen(false);
			setNewCarId("");
			setNewCarModel(CARLA_MODELS[0].value);
			setNewCarLat("");
			setNewCarLon("");
			setTimeout(fetchCarList, 1000);
			setSelectedOwner(null);

			setNewCarMake("");
			setNewCarYear("");
			setNewCarVIN("");
			setNewCarColor("");
		} catch (error) {
			showSnackbar(`Failed to add car: ${error.message}`, "error");
		}
	};

	const removeCar = async (car) => {
		try {
			const token = getAuthToken();
			if (!token) {
				showSnackbar(
					"Authentication required. Please log in.",
					"error"
				);
				return;
			}

			const carlaCarId = car?.carla_car_id || car?.license_plate;
			if (!carlaCarId) {
				showSnackbar("Invalid car identifier", "error");
				return;
			}

			if (car.is_active_in_carla) {
				try {
					await fetch(
						`${CARLA_BRIDGE_URL}/remove-car/${carlaCarId}`,
						{ method: "POST", signal: AbortSignal.timeout(2000) }
					);
				} catch (error) {}
			}

			const response = await fetch(`${API_URL}/cars/${car.car_id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Failed to delete car from database"
				);
			}

			showSnackbar("Car removed successfully", "success");
			setTimeout(fetchCarList, 1000);
		} catch (error) {
			showSnackbar(`Failed to remove car: ${error.message}`, "error");
		}
	};

	const showSnackbar = (message, severity = "success") => {
		setSnackbar({ open: true, message, severity });
	};

	const openEditDialog = () => {
		if (!selectedCar) return;
		const carlaCarId =
			selectedCar?.carla_car_id || selectedCar?.license_plate;
		const telemetry = carlaCarId ? telemetryData[carlaCarId] : undefined;

		setEditCarForm({
			make: selectedCar.make || "",
			model: selectedCar.model || "",
			year: selectedCar.year || "",
			color: selectedCar.color || "",
			status: selectedCar.status || "active",
			license_plate: selectedCar.license_plate || "",
			current_latitude:
				telemetry?.lat ?? selectedCar.current_latitude ?? "",
			current_longitude:
				telemetry?.lon ?? selectedCar.current_longitude ?? "",
		});
		setEditCarDialogOpen(true);
	};

	const handleEditFieldChange = (field, value) => {
		setEditCarForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSaveEditedCar = async () => {
		if (!selectedCar) return;
		const token = getAuthToken();
		if (!token) {
			showSnackbar("Authentication required. Please log in.", "error");
			return;
		}

		const payload = { ...editCarForm };
		if (payload.year !== "") payload.year = Number(payload.year);
		["current_latitude", "current_longitude"].forEach((field) => {
			if (payload[field] === "" || payload[field] === null)
				delete payload[field];
			else {
				const parsedValue = parseFloat(payload[field]);
				if (!Number.isNaN(parsedValue)) payload[field] = parsedValue;
				else delete payload[field];
			}
		});

		try {
			const response = await fetch(
				`${API_URL}/cars/${selectedCar.car_id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to update car");
			}

			const updatedCar = await response.json();
			setCars((prev) =>
				prev.map((car) =>
					car.car_id === updatedCar.car_id
						? { ...car, ...updatedCar }
						: car
				)
			);
			setSelectedCar((prev) =>
				prev && prev.car_id === updatedCar.car_id
					? { ...prev, ...updatedCar }
					: prev
			);
			showSnackbar("Car details updated successfully");
			setEditCarDialogOpen(false);
		} catch (error) {
			showSnackbar(`Failed to update car: ${error.message}`, "error");
		}
	};

	useEffect(() => {
		if (!selectedCar?.is_active_in_carla) return;

		const telemetryInterval = setInterval(
			() => fetchTelemetry(selectedCar),
			15000
		);

		const videoTimeout = setTimeout(() => {
			setupVideoStream(selectedCar);
		}, 100);

		return () => {
			clearInterval(telemetryInterval);
			clearTimeout(videoTimeout);
		};
	}, [selectedCar]);

	const removeDuplicateAlerts = (alerts) => {
		const uniqueAlerts = new Map();
		alerts.forEach((alert) => {
			uniqueAlerts.set(alert.alert_id, alert);
		});
		return Array.from(uniqueAlerts.values());
	};

	const fetchAlerts = useCallback(
		async (page = 1) => {
			if (!selectedCar) {
				setError("No car selected.");
				return;
			}

			setLoadingAlerts(true);
			try {
				const token = getAuthToken();
				if (!token) {
					setError("Authentication required. Please log in.");
					setLoadingAlerts(false);
					return;
				}

				const carId = selectedCar.carla_car_id || selectedCar.car_id;
				const response = await fetch(
					`${API_URL}/alerts/car/${carId}?page=${page}&limit=10`,
					{
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
					}
				);

				if (response.ok) {
					const data = await response.json();
					const newAlerts = Array.isArray(data) ? data : [];
					setAlerts((prev) =>
						removeDuplicateAlerts(
							page === 1 ? newAlerts : [...prev, ...newAlerts]
						)
					);
					setAlertPage(page);
				} else {
					const errorData = await response.json();
					setError(errorData.message || "Failed to fetch alerts.");
				}
			} catch (error) {
				setError(`Failed to fetch alerts: ${error.message}`);
			} finally {
				setLoadingAlerts(false);
			}
		},
		[selectedCar]
	);

	useEffect(() => {
		fetchAlerts();
	}, [fetchAlerts]);

	const getAlertsForCar = async (carId) => {
		try {
			const token = getAuthToken();
			if (!token) {
				setError("Authentication required. Please log in.");
				return;
			}

			const response = await fetch(`${API_URL}/alerts/car/${carId}`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setAlerts(data || []);
			} else {
				const errorData = await response.json();
				setError(
					errorData.message || "Failed to fetch alerts for the car."
				);
			}
		} catch (error) {
			setError(`Failed to fetch alerts for the car: ${error.message}`);
		}
	};

	useEffect(() => {
		if (selectedCar) {
			const carId = selectedCar.carla_car_id || selectedCar.car_id;
			getAlertsForCar(carId);
		}
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

	const getCarDisplayName = (car) => {
		return (
			car.model ||
			car.make ||
			car.license_plate ||
			car.carla_car_id ||
			`Car #${car.car_id}`
		);
	};

	return (
		<DashboardLayout>
			<DashboardNavbar />
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ mb: 4 }}>
					<Typography variant="h4" gutterBottom>
						Vehicle Dashboard
					</Typography>
					<Typography variant="body1" color="textSecondary">
						Monitor and manage your vehicles
					</Typography>
					<Box
						sx={{
							mt: 2,
							display: "flex",
							gap: 2,
							alignItems: "center",
						}}
					>
						{carlaAvailable ? (
							<Chip
								icon={<CarIcon />}
								label="CARLA Connected"
								color="success"
								size="small"
							/>
						) : (
							<Chip
								icon={<CloudOffIcon />}
								label="CARLA Offline - Showing Database Cars"
								color="default"
								size="small"
								variant="outlined"
							/>
						)}
						<Button
							variant="text"
							startIcon={<AddIcon />}
							onClick={() => setAddCarDialogOpen(true)}
						>
							Add Car
						</Button>
					</Box>
				</Box>

				{error && (
					<Alert
						severity="error"
						sx={{ mb: 3 }}
						onClose={() => setError(null)}
					>
						{error}
					</Alert>
				)}

				{loading && (
					<Box>
						<Skeleton
							variant="rectangular"
							height={200}
							sx={{ mb: 2 }}
						/>
						<Skeleton variant="rectangular" height={400} />
					</Box>
				)}

				{!loading && (
					<Card sx={{ mb: 4 }}>
						<CardHeader
							title="Your Vehicles"
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
								<Box
									sx={{
										display: "flex",
										gap: 2,
										flexWrap: "wrap",
									}}
								>
									{cars.map((car) => {
										const carlaCarId =
											car.carla_car_id ||
											car.license_plate;
										const isSelected =
											selectedCar?.car_id ===
												car.car_id ||
											selectedCar?.license_plate ===
												car.license_plate;
										const telemetry = carlaCarId
											? telemetryData[carlaCarId]
											: null;

										return (
											<Box key={car.car_id}>
												{car.owner_name && isAdmin && (
													<Typography
														variant="caption"
														display="block"
														color="textSecondary"
													>
														Owner: {car.owner_name}
													</Typography>
												)}
												<CarListItem
													key={
														car.car_id || carlaCarId
													}
													car={car}
													isSelected={isSelected}
													telemetry={telemetry}
													onSelect={setSelectedCar}
													onRemove={removeCar}
													onEdit={openEditDialog}
												/>
											</Box>
										);
									})}
								</Box>
							) : (
								<Box sx={{ textAlign: "center", py: 4 }}>
									<CarIcon
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
										No vehicles registered
									</Typography>
									<Typography
										variant="body2"
										color="textSecondary"
									>
										Click "Add Car" to register a new
										vehicle
									</Typography>
								</Box>
							)}
						</CardContent>
					</Card>
				)}

				{selectedCar &&
					!loading &&
					(() => {
						const carlaCarId =
							selectedCar?.carla_car_id ||
							selectedCar?.license_plate;
						const carDisplayName = getCarDisplayName(selectedCar);
						const telemetry = carlaCarId
							? telemetryData[carlaCarId]
							: null;
						const isCarlaActive = selectedCar.is_active_in_carla;

						return (
							<Grid container spacing={3}>
								{isCarlaActive && (
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
														justifyContent:
															"center",
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
														onError={() => {}}
													/>
													{!telemetry && (
														<Typography
															position="absolute"
															color="white"
															variant="h6"
														>
															Waiting for video
															stream...
														</Typography>
													)}
												</Box>
											</CardContent>
										</Card>
									</Grid>
								)}

								{!isCarlaActive && (
									<Grid item xs={12} md={8}>
										<Card sx={{ height: "100%" }}>
											<CardHeader
												title={`Vehicle Information - ${carDisplayName}`}
												action={
													<Chip
														icon={<CloudOffIcon />}
														label="Offline"
														color="default"
														size="small"
													/>
												}
											/>
											<CardContent>
												<Grid container spacing={2}>
													<Grid item xs={6} md={3}>
														<Typography
															variant="body2"
															color="textSecondary"
														>
															Make
														</Typography>
														<Typography variant="h6">
															{selectedCar.make ||
																"N/A"}
														</Typography>
													</Grid>
													<Grid item xs={6} md={3}>
														<Typography
															variant="body2"
															color="textSecondary"
														>
															Model
														</Typography>
														<Typography variant="h6">
															{selectedCar.model ||
																"N/A"}
														</Typography>
													</Grid>
													<Grid item xs={6} md={3}>
														<Typography
															variant="body2"
															color="textSecondary"
														>
															Year
														</Typography>
														<Typography variant="h6">
															{selectedCar.year ||
																"N/A"}
														</Typography>
													</Grid>
													<Grid item xs={6} md={3}>
														<Typography
															variant="body2"
															color="textSecondary"
														>
															Color
														</Typography>
														<Typography variant="h6">
															{selectedCar.color ||
																"N/A"}
														</Typography>
													</Grid>
												</Grid>
											</CardContent>
										</Card>
									</Grid>
								)}

								<Grid item xs={12} md={isCarlaActive ? 4 : 12}>
									<Card sx={{ mb: 3 }}>
										<CardHeader
											title="Vehicle Telemetry"
											action={
												isCarlaActive && telemetry ? (
													<Chip
														label={getStatusText(
															telemetry?.speed ||
																0
														)}
														color={getStatusColor(
															telemetry?.speed ||
																0
														)}
													/>
												) : (
													<Chip
														label="Database"
														color="default"
														size="small"
													/>
												)
											}
										/>
										<CardContent>
											{isCarlaActive && telemetry ? (
												<>
													<Box sx={{ mb: 3 }}>
														<Box
															sx={{
																display: "flex",
																alignItems:
																	"center",
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
															{telemetry?.speed ||
																0}{" "}
															km/h
														</Typography>
														<LinearProgress
															variant="determinate"
															value={Math.min(
																((telemetry?.speed ||
																	0) /
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
												</>
											) : (
												<Alert severity="info">
													Live telemetry unavailable.
													Using stored location data
													from database.
												</Alert>
											)}

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
															{telemetry?.lat !==
																undefined &&
															telemetry?.lat !==
																null
																? Number(
																		telemetry.lat
																  ).toFixed(6)
																: selectedCar.current_latitude !==
																		undefined &&
																  selectedCar.current_latitude !==
																		null
																? Number(
																		selectedCar.current_latitude
																  ).toFixed(6)
																: "N/A"}
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
															{telemetry?.lon !==
																undefined &&
															telemetry?.lon !==
																null
																? Number(
																		telemetry.lon
																  ).toFixed(6)
																: selectedCar.current_longitude !==
																		undefined &&
																  selectedCar.current_longitude !==
																		null
																? Number(
																		selectedCar.current_longitude
																  ).toFixed(6)
																: "N/A"}
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
														: selectedCar.last_updated
														? new Date(
																selectedCar.last_updated
														  ).toLocaleString()
														: "Never"}
												</Typography>
											</Box>
										</CardContent>
									</Card>

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
													sx={{ color: "#000000" }}
													color="primary"
													variant="contained"
													startIcon={<RefreshIcon />}
													onClick={fetchCarList}
												>
													Refresh
												</Button>
												<Button
													variant="contained"
													sx={{ color: "#000000" }}
													color="error"
													startIcon={<DeleteIcon />}
													onClick={() =>
														removeCar(selectedCar)
													}
												>
													Remove Car
												</Button>
												<Button
													variant="contained"
													sx={{ color: "#000000" }}
													color="info"
													startIcon={<EditIcon />}
													onClick={openEditDialog}
													disabled={!selectedCar}
												>
													Edit Details
												</Button>
											</Box>
										</CardContent>
									</Card>
								</Grid>

								<Grid item xs={12}>
									<Card>
										<CardHeader title="Vehicle Location" />
										<CardContent>
											{!mapCoordinates ? (
												<Box
													sx={{
														display: "flex",
														justifyContent:
															"center",
														alignItems: "center",
														height: 400,
													}}
												>
													<CircularProgress />
												</Box>
											) : !canUseMaps ? (
												<Alert severity="warning">
													Set{" "}
													<code>
														REACT_APP_GOOGLE_MAPS_API_KEY
													</code>{" "}
													in your frontend environment
													to enable map rendering.
												</Alert>
											) : mapLoadError ? (
												<Alert severity="error">
													Failed to load Google Maps:{" "}
													{mapLoadError.message}
												</Alert>
											) : !isMapLoaded ? (
												<Box
													sx={{
														display: "flex",
														justifyContent:
															"center",
														py: 4,
													}}
												>
													<CircularProgress />
												</Box>
											) : (
												<Box
													sx={{
														width: "100%",
														height: 400,
														borderRadius: 1,
														overflow: "hidden",
													}}
												>
													<GoogleMap
														mapContainerStyle={{
															width: "100%",
															height: "100%",
														}}
														center={
															mapCoordinates ||
															defaultMapCenter
														}
														zoom={16}
														options={{
															fullscreenControl: false,
															mapTypeControl: false,
															streetViewControl: false,
														}}
													>
														<MarkerF
															position={
																mapCoordinates
															}
															label={
																selectedCar?.model ||
																selectedCar?.license_plate ||
																"Vehicle"
															}
														/>
													</GoogleMap>
												</Box>
											)}
										</CardContent>
									</Card>
								</Grid>

								<Grid item xs={12}>
									<Card>
										<CardHeader title="Recent Alerts" />
										<CardContent>
											{alerts &&
											alerts.length === 0 &&
											!loadingAlerts ? (
												<Typography
													variant="body2"
													color="textSecondary"
												>
													No alerts available.
												</Typography>
											) : (
												<>
													<Box
														sx={{
															maxHeight: 300,
															overflowY: "auto",
														}}
													>
														{alerts.map((alert) => (
															<Card
																key={
																	alert.alert_id
																}
																sx={{
																	mb: 2,
																}}
															>
																<CardContent>
																	<Typography
																		variant="h6"
																		gutterBottom
																	>
																		Alert
																		Type:{" "}
																		{
																			alert.alert_type
																		}
																	</Typography>
																	<Typography
																		variant="body2"
																		color="textSecondary"
																	>
																		Confidence:{" "}
																		{Math.round(
																			alert.confidence_score *
																				100
																		)}
																		%
																	</Typography>
																	<Typography
																		variant="body2"
																		color="textSecondary"
																	>
																		Status:{" "}
																		{
																			alert.status
																		}
																	</Typography>
																	<Typography
																		variant="body2"
																		color="textSecondary"
																	>
																		Created
																		At:{" "}
																		{new Date(
																			alert.createdAt
																		).toLocaleString()}
																	</Typography>
																</CardContent>
															</Card>
														))}
													</Box>
													{alerts &&
														alerts.length < 100 && (
															<Button
																onClick={() =>
																	fetchAlerts(
																		alertPage +
																			1
																	)
																}
																disabled={
																	loadingAlerts
																}
															>
																{loadingAlerts
																	? "Loading..."
																	: "Load More"}
															</Button>
														)}
												</>
											)}
										</CardContent>
									</Card>
								</Grid>
							</Grid>
						);
					})()}

				<Dialog
					open={addCarDialogOpen}
					onClose={() => setAddCarDialogOpen(false)}
					maxWidth="sm"
					fullWidth
				>
					<DialogTitle>Add New Vehicle</DialogTitle>
					<DialogContent>
						{isAdmin && (
							<Box sx={{ mb: 3, mt: 1 }}>
								<Autocomplete
									id="owner-select"
									options={availableUsers}
									getOptionLabel={(option) =>
										`${option.name} (${option.email})`
									}
									value={selectedOwner}
									onChange={(event, newValue) => {
										setSelectedOwner(newValue);
									}}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Assign Owner"
											variant="outlined"
											helperText="Search by name or email"
										/>
									)}
								/>
							</Box>
						)}
						<TextField
							autoFocus
							margin="dense"
							label="License Plate"
							type="text"
							fullWidth
							variant="outlined"
							value={newCarId}
							onChange={(e) => setNewCarId(e.target.value)}
							placeholder="e.g., CAR2000"
							helperText="Enter a unique identifier for the vehicle"
							sx={{ mb: 3 }}
						/>
						<Grid container spacing={2} sx={{ mb: 2 }}>
							<Grid item xs={12} sm={6}>
								<TextField
									label="Make"
									type="text"
									fullWidth
									variant="outlined"
									size="small"
									value={newCarMake}
									onChange={(e) =>
										setNewCarMake(e.target.value)
									}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									label="Year"
									type="number"
									fullWidth
									variant="outlined"
									size="small"
									value={newCarYear}
									onChange={(e) =>
										setNewCarYear(e.target.value)
									}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									label="Color"
									type="text"
									fullWidth
									variant="outlined"
									size="small"
									value={newCarColor}
									onChange={(e) =>
										setNewCarColor(e.target.value)
									}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									label="VIN"
									type="text"
									fullWidth
									variant="outlined"
									size="small"
									value={newCarVIN}
									onChange={(e) =>
										setNewCarVIN(e.target.value)
									}
								/>
							</Grid>
						</Grid>
						<Autocomplete
							id="car-model-autocomplete"
							options={CARLA_MODELS}
							getOptionLabel={(option) =>
								`${option.label} (${option.value
									.split(".")
									.pop()})`
							}
							value={
								CARLA_MODELS.find(
									(m) => m.value === newCarModel
								) || CARLA_MODELS[0]
							}
							onChange={(event, newValue) => {
								setNewCarModel(newValue ? newValue.value : "");
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Car Model"
									margin="dense"
									fullWidth
									helperText="Select the model."
								/>
							)}
							disableClearable
						/>
						<Typography
							variant="h6"
							gutterBottom
							sx={{ mt: 2, mb: 1 }}
						>
							Initial Location
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6}>
								<TextField
									margin="dense"
									label="Latitude"
									type="number"
									fullWidth
									variant="outlined"
									value={newCarLat}
									onChange={(e) =>
										setNewCarLat(e.target.value)
									}
									placeholder="e.g., 37.7749"
								/>
							</Grid>
							<Grid item xs={6}>
								<TextField
									margin="dense"
									label="Longitude"
									type="number"
									fullWidth
									variant="outlined"
									value={newCarLon}
									onChange={(e) =>
										setNewCarLon(e.target.value)
									}
									placeholder="e.g., -122.4194"
								/>
							</Grid>
						</Grid>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setAddCarDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={addNewCar}
							variant="contained"
							disabled={
								!newCarId.trim() || (isAdmin && !selectedOwner)
							}
						>
							Add Vehicle
						</Button>
					</DialogActions>
				</Dialog>

				<Dialog
					open={editCarDialogOpen}
					onClose={() => setEditCarDialogOpen(false)}
					maxWidth="sm"
					fullWidth
				>
					<DialogTitle>Edit Vehicle Details</DialogTitle>
					<DialogContent>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="Make"
									fullWidth
									variant="outlined"
									value={editCarForm.make}
									onChange={(e) =>
										handleEditFieldChange(
											"make",
											e.target.value
										)
									}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="Model"
									fullWidth
									variant="outlined"
									value={editCarForm.model}
									onChange={(e) =>
										handleEditFieldChange(
											"model",
											e.target.value
										)
									}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="Year"
									type="number"
									fullWidth
									variant="outlined"
									value={editCarForm.year}
									onChange={(e) =>
										handleEditFieldChange(
											"year",
											e.target.value
										)
									}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="Color"
									fullWidth
									variant="outlined"
									value={editCarForm.color}
									onChange={(e) =>
										handleEditFieldChange(
											"color",
											e.target.value
										)
									}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<Autocomplete
									id="car-status-autocomplete"
									options={CAR_STATUSES}
									value={
										CAR_STATUSES.find(
											(s) =>
												s.value === editCarForm.status
										) || CAR_STATUSES[0]
									}
									onChange={(event, newValue) => {
										handleEditFieldChange(
											"status",
											newValue ? newValue.value : "" // Pass the 'value' string ('active', 'inactive', etc.)
										);
									}}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Status"
											margin="dense"
											fullWidth
											variant="outlined"
										/>
									)}
									getOptionLabel={(option) => option.label}
									disableClearable
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="License Plate / CARLA ID"
									fullWidth
									variant="outlined"
									value={editCarForm.license_plate}
									onChange={(e) =>
										handleEditFieldChange(
											"license_plate",
											e.target.value
										)
									}
									helperText="This should match the CARLA car ID"
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="Latitude"
									type="number"
									fullWidth
									variant="outlined"
									value={editCarForm.current_latitude}
									onChange={(e) =>
										handleEditFieldChange(
											"current_latitude",
											e.target.value
										)
									}
									helperText="Optional manual override"
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									margin="dense"
									label="Longitude"
									type="number"
									fullWidth
									variant="outlined"
									value={editCarForm.current_longitude}
									onChange={(e) =>
										handleEditFieldChange(
											"current_longitude",
											e.target.value
										)
									}
									helperText="Optional manual override"
								/>
							</Grid>
						</Grid>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setEditCarDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="contained"
							onClick={handleSaveEditedCar}
						>
							Save Changes
						</Button>
					</DialogActions>
				</Dialog>

				<Snackbar
					open={snackbar.open}
					autoHideDuration={4000}
					onClose={() => setSnackbar({ ...snackbar, open: false })}
					message={snackbar.message}
					anchorOrigin={{
						vertical: "bottom",
						horizontal: "center",
					}}
				/>
			</Container>
		</DashboardLayout>
	);
};

export default CarlaDashboard;
