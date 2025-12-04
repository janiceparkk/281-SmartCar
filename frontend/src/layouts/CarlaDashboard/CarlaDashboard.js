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
	CloudOff as CloudOffIcon,
} from "@mui/icons-material";
import {
	GoogleMap,
	MarkerF,
	InfoWindowF,
	useJsApiLoader,
} from "@react-google-maps/api";
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

const CARLA_ORIGIN = { lat: 37.7749, lng: -122.4194 }; // San Francisco default

// Helper to determine status color based on speed
const getSpeedStatusColor = (speed) => {
	if (speed > 50) return "error";
	if (speed > 30) return "warning";
	return "success";
};

const getSpeedStatusText = (speed) => {
	if (speed > 50) return "High Speed";
	if (speed > 30) return "Moderate Speed";
	return "Normal";
};

// Car List Item Component (memoized)
const CarListItem = React.memo(
	({ car, isSelected, telemetry, onSelect, onRemove }) => {
		const speed = telemetry?.speed || 0;
		const carDisplayName =
			car.model ||
			car.make ||
			car.license_plate ||
			car.carla_car_id ||
			`Car #${car.car_id}`;

		return (
			<Card
				sx={{
					minWidth: 200,
					cursor: "pointer",
					border: isSelected ? 2 : 1,
					borderColor: isSelected ? "primary.main" : "divider",
					"&:hover": { boxShadow: 2 },
					mb: 2,
				}}
				onClick={() => onSelect(car)}
			>
				<CardContent>
					<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
						<Avatar
							sx={{
								bgcolor: isSelected
									? "primary.main"
									: "grey.500",
								mr: 2,
							}}
						>
							<CarIcon />
						</Avatar>
						<Box sx={{ flexGrow: 1, overflow: "hidden" }}>
							<Typography variant="h6" noWrap>
								{carDisplayName}
							</Typography>
							<Typography variant="body2" color="textSecondary">
								{car.is_active_in_carla
									? `Speed: ${Math.round(speed)} km/h`
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
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						{car.is_active_in_carla && (
							<Chip
								label={getSpeedStatusText(speed)}
								color={getSpeedStatusColor(speed)}
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
							sx={{ color: isSelected ? "#fff" : "inherit" }}
						>
							{isSelected ? "Viewing" : "Select"}
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
				nextProps.car.is_active_in_carla &&
			prevProps.car.current_latitude === nextProps.car.current_latitude &&
			prevProps.car.current_longitude === nextProps.car.current_longitude
		);
	}
);

const CarlaDashboard = () => {
	const { carId } = useParams();
	const [cars, setCars] = useState([]);
	const [selectedCar, setSelectedCar] = useState(null);
	const [telemetryData, setTelemetryData] = useState({}); // key: carla_car_id -> telemetry
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [addCarDialogOpen, setAddCarDialogOpen] = useState(false);

	// New Car Form State
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

	// Edit Car Form State
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

	// Alerts handling
	const [alerts, setAlerts] = useState([]); // selected car alerts
	const [alertsByCar, setAlertsByCar] = useState({}); // global recent alerts keyed by carla_car_id or car_id
	const [alertPage, setAlertPage] = useState(1);
	const [loadingAlerts, setLoadingAlerts] = useState(false);

	const [availableUsers, setAvailableUsers] = useState([]);
	const [selectedOwner, setSelectedOwner] = useState(null);
	const [isAdmin, setIsAdmin] = useState(false);

	// Map & pulse state
	const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
		id: "google-map-script",
		googleMapsApiKey: GOOGLE_MAPS_API_KEY || "DUMMY_KEY",
	});
	const canUseMaps = Boolean(GOOGLE_MAPS_API_KEY);
	const defaultMapCenter = useMemo(
		() => ({ lat: 37.7749, lng: -122.4194 }),
		[]
	);
	const mapRef = useRef(null);
	const [mapZoom, setMapZoom] = useState(15);
	const [pulse, setPulse] = useState(false); // toggles to create pulsing effect
	const pulseIntervalRef = useRef(null);

	const isFetching = useRef(false);

	// Helpers
	const getAuthToken = () => localStorage.getItem("token");

	const showSnackbar = (message, severity = "success") => {
		setSnackbar({ open: true, message, severity });
	};

	const carlaToLatLng = (x, y, originLat, originLng) => {
		const metersPerDegreeLat = 111320;
		const metersPerDegreeLng =
			(40075000 * Math.cos((originLat * Math.PI) / 180)) / 360;

		const lat = originLat + y / metersPerDegreeLat;
		const lng = originLng + x / metersPerDegreeLng;

		return { lat, lng };
	};

	// Helper to get coordinates for ANY car (from telemetry OR database)
	const getCarCoordinates = (car) => {
		const carlaCarId = car.carla_car_id || car.license_plate;
		const telemetry = carlaCarId ? telemetryData[carlaCarId] : null;

		// 1. Try Live Telemetry (assumes telemetry provides lat/lon in CARLA coordinates)
		if (telemetry?.lat !== undefined && telemetry?.lon !== undefined) {
			return carlaToLatLng(
				telemetry.lon,
				telemetry.lat,
				CARLA_ORIGIN.lat,
				CARLA_ORIGIN.lng
			);
		}

		// 2. Try DB Coordinates (assume already lat/lng)
		if (car.current_latitude && car.current_longitude) {
			return {
				lat: Number(car.current_latitude),
				lng: Number(car.current_longitude),
			};
		}

		return null;
	};

	// Map onLoad
	const onMapLoad = useCallback((map) => {
		mapRef.current = map;
	}, []);

	// Smooth recenter helper
	const smoothRecenter = useCallback((latLng, zoom = 16) => {
		if (!mapRef.current || !latLng) return;
		try {
			// panTo provides smooth panning
			mapRef.current.panTo(latLng);
			// animate zoom gently
			if (
				mapRef.current.getZoom &&
				typeof mapRef.current.getZoom === "function"
			) {
				const currentZoom = mapRef.current.getZoom();
				if (currentZoom < zoom) mapRef.current.setZoom(zoom);
			}
		} catch (e) {
			// fallback
			mapRef.current.setCenter(latLng);
			mapRef.current.setZoom(zoom);
		}
	}, []);

	// API Calls
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
				setIsAdmin(true);
			} else {
				setIsAdmin(false);
			}
		} catch (error) {
			console.error("Failed to fetch users", error);
		}
	}, []);

	const fetchCarList = useCallback(
		async (manualRefresh = false) => {
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

				// Try to fetch from CARLA bridge endpoint
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
					// Fallback: Fetch user-owned cars from database only
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
					if (!selectedCar && carId) {
						const targetCar = carList.find(
							(car) => car.carla_car_id === carId
						);
						if (targetCar) setSelectedCar(targetCar);
					}
				}
			} catch (error) {
				console.error("Error fetching car list:", error);
				setError(`Failed to fetch vehicles: ${error.message}`);
			} finally {
				setLoading(false);
				isFetching.current = false;
			}
		},
		[carId, selectedCar]
	);

	// Fetch Telemetry for ALL Active Cars (for Map)
	const fetchAllTelemetry = useCallback(async () => {
		const activeCars = cars.filter(
			(c) => c.is_active_in_carla && c.carla_car_id
		);
		if (activeCars.length === 0) return;

		await Promise.all(
			activeCars.map(async (car) => {
				try {
					const carlaCarId = car.carla_car_id;
					const response = await fetch(
						`${CARLA_BRIDGE_URL}/telemetry/${carlaCarId}`,
						{
							signal: AbortSignal.timeout(1500),
						}
					);
					if (!response.ok) return;
					const data = await response.json();
					setTelemetryData((prev) => {
						// avoid full replace if equal
						const prevVal = prev[carlaCarId];
						const nextVal = data.telemetry;
						if (JSON.stringify(prevVal) === JSON.stringify(nextVal))
							return prev;
						return { ...prev, [carlaCarId]: nextVal };
					});
				} catch (error) {
					// ignore per-car telemetry failures
				}
			})
		);
	}, [cars]);

	// Setup Video Stream (Only for selected car)
	const setupVideoStream = (car) => {
		if (!car?.is_active_in_carla || !car?.carla_car_id) return;

		const carlaCarId = car.carla_car_id;
		const videoElement = videoRefs.current[carlaCarId];

		if (videoElement) {
			videoElement.src = `${CARLA_BRIDGE_URL}/video-stream/${carlaCarId}?t=${Date.now()}`;
		}
	};

	// Effects

	useEffect(() => {
		fetchCarList();
		fetchUsers();
		const carListInterval = setInterval(
			() => fetchCarList(),
			carlaAvailable ? 60000 : 120000
		);

		return () => clearInterval(carListInterval);
	}, [fetchCarList, carlaAvailable, fetchUsers]);

	// Global Telemetry Loop
	useEffect(() => {
		if (!carlaAvailable) return;
		const telemetryInterval = setInterval(fetchAllTelemetry, 2000);
		void fetchAllTelemetry(); // initial fetch
		return () => clearInterval(telemetryInterval);
	}, [cars, carlaAvailable, fetchAllTelemetry]);

	// Effect: Video Stream for Selected Car and Map Recenter
	useEffect(() => {
		if (!selectedCar) return;
		const videoTimeout = setTimeout(() => {
			setupVideoStream(selectedCar);
		}, 200);
		// auto-recenter map to selected car
		const coords = getCarCoordinates(selectedCar);
		if (coords) smoothRecenter(coords, 16);
		return () => clearTimeout(videoTimeout);
	}, [selectedCar, telemetryData, smoothRecenter]);

	// Alerts Logic
	// remove duplicates by alert_id
	const removeDuplicateAlerts = (alertsArr) => {
		const unique = new Map();
		alertsArr.forEach((a) => unique.set(a.alert_id, a));
		return Array.from(unique.values());
	};

	// fetch alerts for selectedCar
	const fetchAlerts = useCallback(
		async (page = 1) => {
			if (!selectedCar) return;

			setLoadingAlerts(true);
			try {
				const token = getAuthToken();
				if (!token) return;

				const carIdKey = selectedCar.carla_car_id || selectedCar.car_id;
				const response = await fetch(
					`${API_URL}/alerts/car/${carIdKey}?page=${page}&limit=10`,
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
				}
			} catch (error) {
				console.error("Alert fetch error", error);
			} finally {
				setLoadingAlerts(false);
			}
		},
		[selectedCar]
	);

	useEffect(() => {
		fetchAlerts();
	}, [fetchAlerts]);

	// NEW: fetch recent alerts globally and map them to cars (used to decide map markers)
	const fetchRecentAlertsPerCar = useCallback(async () => {
		const token = getAuthToken();
		if (!token) return;

		const activeCarKeys = cars
			.map((c) => c.carla_car_id || c.license_plate || c.car_id)
			.filter(Boolean);
		const newAlertsByCar = {};

		// Fetch the latest alert for every active car concurrently
		await Promise.all(
			activeCarKeys.map(async (carKey) => {
				try {
					const response = await fetch(
						`${API_URL}/alerts/car/${carKey}?limit=1&minutes=2`, // Assumes backend supports limit/minutes
						{
							signal: AbortSignal.timeout(2000),
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${token}`,
							},
						}
					);

					if (response.ok) {
						const data = await response.json();
						const recentAlerts = Array.isArray(data) ? data : [];

						// Filter in frontend if backend can't filter by time
						const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

						// Check if the single, latest alert is recent (within 2 minutes)
						if (
							recentAlerts.length > 0 &&
							new Date(recentAlerts[0].createdAt).getTime() >=
								twoMinutesAgo
						) {
							newAlertsByCar[carKey] = [recentAlerts[0]]; // Store just the recent one
						}
					}
				} catch (err) {
					// Ignore per-car alert failures
				}
			})
		);

		setAlertsByCar(newAlertsByCar);
	}, [cars]); // Dependency on 'cars' ensures it checks the current fleet

	// Alert Polling Loop
	useEffect(() => {
		let intervalId;
		if (getAuthToken()) {
			void fetchRecentAlertsPerCar(); // Initial fetch
			intervalId = setInterval(() => fetchRecentAlertsPerCar(), 10000); // Poll every 10s
		}
		return () => clearInterval(intervalId);
	}, [fetchRecentAlertsPerCar]);

	// create pulsing effect if any recent alerts exist
	useEffect(() => {
		const hasAnyAlerts = Object.keys(alertsByCar).length > 0;
		if (!hasAnyAlerts) {
			setPulse(false);
			if (pulseIntervalRef.current) {
				clearInterval(pulseIntervalRef.current);
				pulseIntervalRef.current = null;
			}
			return;
		}
		// start pulse toggler
		setPulse(true);
		if (!pulseIntervalRef.current) {
			pulseIntervalRef.current = setInterval(() => {
				setPulse((p) => !p);
			}, 700);
		}
		return () => {
			if (pulseIntervalRef.current) {
				clearInterval(pulseIntervalRef.current);
				pulseIntervalRef.current = null;
			}
		};
	}, [alertsByCar]);

	// CRUD Operations
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
		if (!window.confirm("Are you sure you want to remove this vehicle?"))
			return;

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

			if (car.is_active_in_carla && carlaCarId) {
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
			if (selectedCar?.car_id === car.car_id) setSelectedCar(null);
			setTimeout(fetchCarList, 1000);
		} catch (error) {
			showSnackbar(`Failed to remove car: ${error.message}`, "error");
		}
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

	const getCarDisplayName = (car) => {
		if (!car) return "Unknown";
		return (
			car.model ||
			car.make ||
			car.license_plate ||
			car.carla_car_id ||
			`Car #${car.car_id}`
		);
	};

	// Marker Icon Helpers
	// Create an SVG data URL for marker with character text centered inside
	const createSvgDataUrl = (
		opts = {
			bg: "#2e7d32",
			label: null,
			size: 36,
			stroke: "#fff",
			strokeWidth: 2,
		}
	) => {
		const { bg, label, size, stroke, strokeWidth } = opts;
		const inner = label
			? `<text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="${Math.round(
					size * 0.45
			  )}" font-weight="700" fill="#fff">${label}</text>`
			: "";
		const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
			<circle cx='${size / 2}' cy='${size / 2}' r='${
			size / 2 - strokeWidth
		}' fill='${bg}' stroke='${stroke}' stroke-width='${strokeWidth}' />
			${inner}
		</svg>`;
		return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
	};

	// choose icon for car based on alert presence and coordinate availability
	const getMarkerIconForCar = (car, isSelected, pulseOn) => {
		const pos = getCarCoordinates(car);
		const carKey = car.carla_car_id || car.license_plate || car.car_id;
		const recentAlerts = alertsByCar[carKey] || [];

		const hasRecentAlert = recentAlerts.length > 0;
		// Unknown telemetry/coords
		if (!pos) {
			return {
				url: createSvgDataUrl({
					bg: "#ffb300",
					label: "?",
					size: pulseOn ? 48 : 36,
					stroke: "#fff",
					strokeWidth: 3,
				}),
				scaledSize: new window.google.maps.Size(
					pulseOn ? 48 : 36,
					pulseOn ? 48 : 36
				),
				anchor: new window.google.maps.Point(
					(pulseOn ? 48 : 36) / 2,
					(pulseOn ? 48 : 36) / 2
				),
			};
		}
		// Alert
		if (hasRecentAlert) {
			return {
				url: createSvgDataUrl({
					bg: "#d32f2f",
					label: "!",
					size: pulseOn ? 56 : 40,
					stroke: "#ffffff",
					strokeWidth: 3,
				}),
				scaledSize: new window.google.maps.Size(
					pulseOn ? 56 : 40,
					pulseOn ? 56 : 40
				),
				anchor: new window.google.maps.Point(
					(pulseOn ? 56 : 40) / 2,
					(pulseOn ? 56 : 40) / 2
				),
			};
		}
		// Normal
		return {
			url: createSvgDataUrl({
				bg: isSelected ? "#1976d2" : "#2e7d32",
				label: null,
				size: isSelected ? 44 : 32,
				stroke: "#fff",
				strokeWidth: 3,
			}),
			scaledSize: new window.google.maps.Size(
				isSelected ? 44 : 32,
				isSelected ? 44 : 32
			),
			anchor: new window.google.maps.Point(
				isSelected ? 22 : 16,
				isSelected ? 22 : 16
			),
		};
	};

	// Memoize Marker components so map doesn't re-render everything continuously
	const markers = useMemo(() => {
		if (!isMapLoaded) return null;
		return cars.map((car) => {
			const position = getCarCoordinates(car);
			if (!position) {
				return null;
			}
			const carlaCarId = car.carla_car_id || car.license_plate;
			const tel = telemetryData[carlaCarId];
			const speed = tel?.speed || 0;
			const isSelected = selectedCar?.car_id === car.car_id;
			// Determine if this car has an alert via alertsByCar
			const carKey = carlaCarId || car.car_id;
			const recentAlerts = alertsByCar[carKey] || [];
			const hasAlert = recentAlerts.length > 0;

			const icon = getMarkerIconForCar(
				car,
				isSelected,
				pulse && hasAlert
			);

			return (
				<MarkerF
					key={car.car_id}
					position={position}
					onClick={() => {
						setSelectedCar(car);
						// When click marker, also fetch selected car alerts details
						void fetchAlerts(1);
					}}
					icon={icon}
					// subtle zIndex for selected/alert
					zIndex={isSelected ? 999 : hasAlert ? 900 : 100}
					animation={
						window.google &&
						window.google.maps &&
						window.google.maps.Animation
							? window.google.maps.Animation.DROP
							: undefined
					}
				>
					{selectedCar?.car_id === car.car_id && (
						<InfoWindowF
							position={position}
							onCloseClick={() => setSelectedCar(null)}
						>
							<Box sx={{ p: 1, minWidth: 200 }}>
								<Typography
									variant="subtitle2"
									fontWeight="bold"
								>
									{getCarDisplayName(car)}
								</Typography>
								<Typography variant="caption" display="block">
									Status: {car.status || "Unknown"}
								</Typography>
								<Typography variant="caption" display="block">
									Speed: {Math.round(speed)} km/h
								</Typography>
								{alertsByCar[carKey] &&
									alertsByCar[carKey].length > 0 && (
										<Typography
											variant="caption"
											color="error"
											display="block"
										>
											Recent Alerts:{" "}
											{alertsByCar[carKey].length}
										</Typography>
									)}
							</Box>
						</InfoWindowF>
					)}
				</MarkerF>
			);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cars, telemetryData, selectedCar, isMapLoaded, alertsByCar, pulse]);

	// Render
	return (
		<DashboardLayout>
			<DashboardNavbar />
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ mb: 4 }}>
					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Box>
							<Typography variant="h4" gutterBottom>
								Car Real-Time Management
							</Typography>
							<Typography variant="body1" color="textSecondary">
								Real-time monitoring and management
							</Typography>
						</Box>
						<Box sx={{ display: "flex", gap: 2 }}>
							{carlaAvailable ? (
								<Chip
									icon={<CarIcon />}
									label="CARLA Online"
									color="success"
								/>
							) : (
								<Chip
									icon={<CloudOffIcon />}
									label="Offline Mode"
									variant="outlined"
								/>
							)}
							<Button
								color="primary"
								variant="contained"
								startIcon={<AddIcon />}
								onClick={() => setAddCarDialogOpen(true)}
								sx={{
									color: "#fff",
								}}
							>
								Add Car
							</Button>
						</Box>
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

				{/* Map View */}
				<Card sx={{ mb: 4, overflow: "hidden" }}>
					<CardHeader
						title="Fleet Map"
						action={
							<Tooltip title="Refresh Map">
								<IconButton onClick={() => fetchCarList(true)}>
									<RefreshIcon />
								</IconButton>
							</Tooltip>
						}
					/>
					<Box
						sx={{
							height: 500,
							width: "100%",
							position: "relative",
						}}
					>
						{!canUseMaps ? (
							<Alert severity="warning" sx={{ m: 2 }}>
								Google Maps API Key missing in environment
								variables.
							</Alert>
						) : !isMapLoaded ? (
							<Box
								sx={{
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									height: "100%",
								}}
							>
								<CircularProgress />
							</Box>
						) : mapLoadError ? (
							<Alert severity="error" sx={{ m: 2 }}>
								Map Error: {mapLoadError.message}
							</Alert>
						) : (
							<GoogleMap
								mapContainerStyle={{
									width: "100%",
									height: "100%",
								}}
								center={defaultMapCenter}
								zoom={mapZoom}
								onLoad={onMapLoad}
								options={{
									fullscreenControl: false,
									streetViewControl: false,
									mapTypeControl: false,
								}}
							>
								{/* markers are memoized */}
								{markers}
							</GoogleMap>
						)}
					</Box>
				</Card>

				{/* BOTTOM SECTION: Split View (List & Details) */}
				<Grid container spacing={3}>
					{/* Left: Car List */}
					<Grid item xs={12} md={4}>
						<Card
							sx={{
								maxHeight: 800,
								display: "flex",
								flexDirection: "column",
							}}
						>
							<CardHeader
								title="Vehicles List"
								subheader={`${cars.length} cars available`}
							/>
							<CardContent
								sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}
							>
								{loading ? (
									<Box>
										<Skeleton height={100} sx={{ mb: 1 }} />
										<Skeleton height={100} sx={{ mb: 1 }} />
									</Box>
								) : cars.length === 0 ? (
									<Typography
										align="center"
										color="textSecondary"
									>
										No vehicles found. Add one to get
										started.
									</Typography>
								) : (
									cars.map((car) => (
										<CarListItem
											key={car.car_id}
											car={car}
											isSelected={
												selectedCar?.car_id ===
												car.car_id
											}
											telemetry={
												telemetryData[
													car.carla_car_id ||
														car.license_plate
												]
											}
											onSelect={(c) => {
												setSelectedCar(c);
												void fetchAlerts(1); // fetch alerts when selecting
											}}
											onRemove={removeCar}
										/>
									))
								)}
							</CardContent>
						</Card>
					</Grid>

					{/* Right: Selected Car Details */}
					<Grid item xs={12} md={8}>
						{!selectedCar ? (
							<Card
								sx={{
									height: "100%",
									minHeight: 400,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									bgcolor: "#f8f9fa",
								}}
							>
								<Box textAlign="center">
									<CarIcon
										sx={{
											fontSize: 60,
											color: "text.disabled",
											mb: 2,
										}}
									/>
									<Typography
										variant="h6"
										color="textSecondary"
									>
										Select a vehicle to view details
									</Typography>
								</Box>
							</Card>
						) : (
							<Box>
								{/* Active Car: Live Video */}
								{selectedCar.is_active_in_carla && (
									<Card sx={{ mb: 3 }}>
										<CardHeader
											title={`Live View: ${getCarDisplayName(
												selectedCar
											)}`}
											action={
												<Chip
													label="LIVE STREAM"
													color="error"
													size="small"
												/>
											}
										/>
										<CardContent sx={{ p: 0 }}>
											<Box
												sx={{
													width: "100%",
													height: "400px",
													bgcolor: "black",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													position: "relative",
													overflow: "hidden",
												}}
											>
												<img
													ref={(el) =>
														(videoRefs.current[
															selectedCar.carla_car_id
														] = el)
													}
													alt="Stream"
													style={{
														width: "100%",
														height: "100%",
														objectFit: "contain",
													}}
													onError={(e) => {
														e.target.style.display =
															"none";
													}}
												/>
												{!telemetryData[
													selectedCar.carla_car_id
												] && (
													<Typography
														color="white"
														position="absolute"
													>
														Connecting to video
														feed...
													</Typography>
												)}
											</Box>
										</CardContent>
									</Card>
								)}

								{/* Telemetry & Info Cards */}
								<Grid container spacing={3}>
									<Grid item xs={12} md={6}>
										<Card sx={{ height: "100%" }}>
											<CardHeader title="Telemetry Data" />
											<CardContent>
												{selectedCar.is_active_in_carla ? (
													<>
														<Box
															sx={{
																mb: 3,
																textAlign:
																	"center",
															}}
														>
															<Typography
																variant="body2"
																color="textSecondary"
															>
																Current Speed
															</Typography>
															<Typography
																variant="h3"
																color="primary"
															>
																{telemetryData[
																	selectedCar
																		.carla_car_id
																]?.speed || 0}
																<Typography
																	component="span"
																	variant="h6"
																	color="textSecondary"
																>
																	{" "}
																	km/h
																</Typography>
															</Typography>
															<LinearProgress
																variant="determinate"
																value={Math.min(
																	telemetryData[
																		selectedCar
																			.carla_car_id
																	]?.speed ||
																		0,
																	100
																)}
																sx={{
																	mt: 1,
																	height: 10,
																	borderRadius: 5,
																}}
																color={getSpeedStatusColor(
																	telemetryData[
																		selectedCar
																			.carla_car_id
																	]?.speed ||
																		0
																)}
															/>
														</Box>
														<Grid
															container
															spacing={1}
														>
															<Grid item xs={6}>
																<Typography
																	variant="caption"
																	color="textSecondary"
																>
																	Latitude
																</Typography>
																<Typography
																	variant="body1"
																	fontFamily="monospace"
																>
																	{Number(
																		telemetryData[
																			selectedCar
																				.carla_car_id
																		]
																			?.lat ||
																			0
																	).toFixed(
																		6
																	)}
																</Typography>
															</Grid>
															<Grid item xs={6}>
																<Typography
																	variant="caption"
																	color="textSecondary"
																>
																	Longitude
																</Typography>
																<Typography
																	variant="body1"
																	fontFamily="monospace"
																>
																	{Number(
																		telemetryData[
																			selectedCar
																				.carla_car_id
																		]
																			?.lon ||
																			0
																	).toFixed(
																		6
																	)}
																</Typography>
															</Grid>
														</Grid>
													</>
												) : (
													<Alert
														severity="info"
														icon={<CloudOffIcon />}
													>
														Vehicle is offline.
														Showing last known
														database info.
													</Alert>
												)}
											</CardContent>
										</Card>
									</Grid>

									<Grid item xs={12} md={6}>
										<Card sx={{ height: "100%" }}>
											<CardHeader title="Vehicle Details" />
											<CardContent>
												<Grid container spacing={2}>
													<Grid item xs={6}>
														<Typography
															variant="caption"
															color="textSecondary"
														>
															Make/Model
														</Typography>
														<Typography variant="body1">
															{selectedCar.make}{" "}
															{selectedCar.model}
														</Typography>
													</Grid>
													<Grid item xs={6}>
														<Typography
															variant="caption"
															color="textSecondary"
														>
															Color
														</Typography>
														<Typography variant="body1">
															{selectedCar.color ||
																"N/A"}
														</Typography>
													</Grid>
													<Grid item xs={6}>
														<Typography
															variant="caption"
															color="textSecondary"
														>
															Year
														</Typography>
														<Typography variant="body1">
															{selectedCar.year ||
																"N/A"}
														</Typography>
													</Grid>
													<Grid item xs={6}>
														<Typography
															variant="caption"
															color="textSecondary"
														>
															Status
														</Typography>
														<Chip
															label={
																selectedCar.status
															}
															size="small"
															variant="outlined"
														/>
													</Grid>
												</Grid>
												<Box
													sx={{
														mt: 3,
														display: "flex",
														gap: 1,
													}}
												>
													<Button
														variant="contained" // CHANGED to 'contained'
														startIcon={<EditIcon />}
														size="small"
														onClick={openEditDialog}
														sx={{
															color: "#fff",
														}}
													>
														Edit
													</Button>
													<Button
														variant="contained" // CHANGED to 'contained'
														color="error"
														startIcon={
															<DeleteIcon />
														}
														size="small"
														onClick={() =>
															removeCar(
																selectedCar
															)
														}
													>
														Remove
													</Button>
												</Box>
											</CardContent>
										</Card>
									</Grid>

									{/* Alerts Section */}
									<Grid item xs={12}>
										<Card>
											<CardHeader title="Recent Alerts" />
											<CardContent>
												{alerts.length === 0 ? (
													<Typography
														color="textSecondary"
														variant="body2"
													>
														No alerts recorded.
													</Typography>
												) : (
													<Box
														sx={{
															maxHeight: 200,
															overflowY: "auto",
														}}
													>
														{alerts.map((alert) => (
															<Alert
																severity="warning"
																key={
																	alert.alert_id
																}
																sx={{ mb: 1 }}
															>
																<Typography variant="subtitle2">
																	{
																		alert.alert_type
																	}
																</Typography>
																<Typography variant="caption">
																	{new Date(
																		alert.createdAt
																	).toLocaleString()}{" "}
																	-
																	Confidence:{" "}
																	{(
																		alert.confidence_score *
																		100
																	).toFixed(
																		0
																	)}
																	%
																</Typography>
															</Alert>
														))}
													</Box>
												)}
											</CardContent>
										</Card>
									</Grid>
								</Grid>
							</Box>
						)}
					</Grid>
				</Grid>

				{/* Dialogs */}
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
						<Button
							color="primary"
							onClick={() => setAddCarDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							color="primary"
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
											newValue ? newValue.value : ""
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
						<Button
							color="primary"
							onClick={() => setEditCarDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							color="primary"
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
					anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
				/>
			</Container>
		</DashboardLayout>
	);
};

export default CarlaDashboard;
