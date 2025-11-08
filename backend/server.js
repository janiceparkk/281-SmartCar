const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const mongoose = require("mongoose");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For token-based authentication

// --- ENVIRONMENT VARIABLE LOADING (NEW) ---
// IMPORTANT: This line requires the 'dotenv' package to be installed (npm install dotenv)
// and must be called before accessing any process.env variables below.
require("dotenv").config();

// Import Route Modules
const authRouter = require("./routes/authRoutes");
const carRouter = require("./routes/carRoutes");
const alertRouter = require("./routes/alertRoutes");
const deviceRouter = require("./routes/deviceRoutes");
// const statsRouter = require("./routes/statsRoutes");
// const userRouter = require("./routes/userRoutes");

// Import MQTT Service for Phase 2 Real-time Connectivity
const MQTTService = require("./services/mqttService");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Configuration ---

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
	console.error(
		"CRITICAL ERROR: JWT_SECRET environment variable is not set. The server cannot function without a secret key."
	);
	process.exit(1); // Exit the process if the secret is missing
}
const PG_CONFIG = {
	user: process.env.PG_USER,
	host: process.env.PG_HOST,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
	port: process.env.PG_PORT,
};

// --- Middleware ---
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- Database Connections ---

// 1. PostgreSQL Connection (Relational Data: Cars, Users metadata)
const pgPool = new Pool(PG_CONFIG);

pgPool
	.connect()
	.then((client) => {
		console.log("[DB] PostgreSQL connected successfully.");
		client.release();
		createCarTable();
		createDeviceTable();
	})
	.catch((err) =>
		console.error(
			"[DB] PostgreSQL connection error:",
			err.message,
			"Ensure PostgreSQL is running and credentials are correct."
		)
	);

// 2. MongoDB Connection (Unstructured/Time-Series Data & Users/Auth)
mongoose
	.connect(MONGO_URI)
	.then(() => console.log("[DB] MongoDB connected successfully."))
	.catch((err) =>
		console.error(
			"[DB] MongoDB connection error:",
			err.message,
			"Ensure MongoDB is running and MONGO_URI is set."
		)
	);

// 3. MQTT Service Connection (Phase 2: Real-time Device Connectivity)
const mqttService = new MQTTService({
	brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
	heartbeatTimeout: 60000,  // 60 seconds
	idleTimeout: 300000,      // 5 minutes
	offlineTimeout: 1800000   // 30 minutes
});

// Initialize MQTT connection
mqttService.connect()
	.then(() => {
		console.log("[MQTT] Service initialized successfully.");
		setupMQTTEventHandlers();
	})
	.catch((err) => {
		console.error("[MQTT] Service initialization failed:", err.message);
		console.warn("[MQTT] System will continue without MQTT connectivity.");
	});

// --- MongoDB Schemas and Models ---

const AlertSchema = new mongoose.Schema(
	{
		car_id: { type: String, required: true, index: true },
		alert_id: { type: String, required: true, unique: true },
		alert_type: { type: String, required: true },
		sound_classification: { type: String },
		confidence_score: { type: Number, required: true },
		status: { type: String, default: "Active", index: true },
		acknowledged_by: { type: String }, // user_id who acknowledged
		acknowledged_at: { type: Date },
		closed_by: { type: String }, // user_id who closed
		closed_at: { type: Date },
	},
	{ timestamps: true }
);

const UserSchema = new mongoose.Schema({
	user_id: { type: String, required: true, unique: true, index: true }, // Internal ID
	email: { type: String, required: true, unique: true, trim: true },
	password: { type: String, required: true }, // Hashed
	name: { type: String, required: true },
	role: {
		type: String,
		enum: ["CarOwner", "Admin", "ServiceStaff"],
		default: "CarOwner",
	},
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

const Alert = mongoose.model("Alert", AlertSchema);
const User = mongoose.model("User", UserSchema);

// --- State and Helpers ---
let uniqueIdSeed = 1; // Used for alert_id generation
const uniqueUserIdSeed = () => `U${Math.floor(Math.random() * 100000)}`;

// --- Authentication Middleware ---

/** Middleware to verify JWT token and attach user to request. */
const authMiddleware = (req, res, next) => {
	const token = req.header("Authorization")?.replace("Bearer ", "");
	if (!token) {
		return res
			.status(401)
			.json({ message: "Access denied. No token provided." });
	}
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded; // Contains { id, role }
		next();
	} catch (ex) {
		res.status(400).json({ message: "Invalid token." });
	}
};

/** Middleware to check if user is Admin */
const adminMiddleware = (req, res, next) => {
	if (req.user.role !== "Admin") {
		return res.status(403).json({ message: "Access denied. Admin only." });
	}
	next();
};

// --- Core Database Services (Used by Routes and WS) ---

/** Registers a new smart car/device in PostgreSQL. */
async function registerSmartCar(data) {
	const carId = data.carId || `CAR${Math.floor(Math.random() * 10000)}`;
	const result = await pgPool.query(
		`INSERT INTO smart_cars (car_id, user_id, model, status, last_heartbeat)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
		[
			carId,
			data.user_id, // This must be the MongoDB user_id
			data.model || "Autonomous Vehicle",
			"Offline",
			new Date(),
		]
	);
	console.log(`[DB] Registered new car: ${result.rows[0].car_id}`);
	return result.rows[0];
}

async function createCarTable() {
	const query = `
        CREATE TABLE IF NOT EXISTS smart_cars (
            car_id VARCHAR(50) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            model VARCHAR(100),
            status VARCHAR(20),
            current_latitude DECIMAL(9, 6),
            current_longitude DECIMAL(9, 6),
            last_heartbeat TIMESTAMP WITH TIME ZONE
        );
    `;
	try {
		await pgPool.query(query);
		console.log("[DB] PostgreSQL Car table verified/created.");
		// Pre-register a mock car if not exists for testing the agent connection
		const countResult = await pgPool.query(
			'SELECT COUNT(*) FROM smart_cars WHERE car_id = $1',
			["CAR1000"]
		);
		if (parseInt(countResult.rows[0].count) === 0) {
			await registerSmartCar({
				carId: "CAR1000",
				user_id: "U001", // Default user ID for mock car
				model: "Tesla Model S",
			});
		}
	} catch (err) {
		console.error("[DB] Error creating PostgreSQL table:", err.message);
	}
}

async function createDeviceTable() {
	const query = `
		CREATE TABLE IF NOT EXISTS iot_devices (
			device_id VARCHAR(50) PRIMARY KEY,
			car_id VARCHAR(50) REFERENCES smart_cars(car_id) ON DELETE CASCADE,
			device_type VARCHAR(100),
			status VARCHAR(50),
			firmware_version VARCHAR(50),
			certificate_data TEXT,
			mqtt_client_id VARCHAR(100),
			last_heartbeat TIMESTAMP WITH TIME ZONE,
			connection_quality JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`;
	try {
		await pgPool.query(query);
		console.log("[DB] PostgreSQL IoT Devices table verified/created.");
		// Pre-register a mock device for testing
		const countResult = await pgPool.query(
			'SELECT COUNT(*) FROM iot_devices WHERE device_id = $1',
			["IOT-001"]
		);
		if (parseInt(countResult.rows[0].count) === 0) {
			await registerDevice({
				deviceId: "IOT-001",
				carId: "CAR1000",
				deviceType: "Temperature Sensor",
				firmwareVersion: "1.0.0",
			});
		}
	} catch (err) {
		console.error("[DB] Error creating IoT devices table:", err.message);
	}
}

/** Retrieves a car record from PostgreSQL. */
async function getSmartCarById(carId) {
	const result = await pgPool.query(
		'SELECT * FROM smart_cars WHERE car_id = $1',
		[carId]
	);
	return result.rows[0] || null;
}

/** Updates a car's real-time telemetry and status in PostgreSQL. */
async function updateCarTelemetry(carId, lat, lon, status) {
	const query = `
        UPDATE smart_cars
        SET current_latitude = $1,
            current_longitude = $2,
            status = $3,
            last_heartbeat = NOW()
        WHERE car_id = $4
        RETURNING *;
    `;
	const result = await pgPool.query(query, [lat, lon, status, carId]);
	return result.rows[0];
}

/** Registers a new user in MongoDB. */
async function registerUser(data) {
	const existingUser = await User.findOne({ email: data.email });
	if (existingUser) {
		throw new Error("User with this email already exists.");
	}
	const user = new User({
		user_id: uniqueUserIdSeed(),
		email: data.email,
		password: data.password,
		name: data.name,
		role: data.role || "CarOwner",
	});
	await user.save();
	return {
		id: user.user_id,
		email: user.email,
		name: user.name,
		role: user.role,
	};
}

/** Logs a real-time audio alert event to the MongoDB store. */
async function logAudioAlert(alertData) {
	try {
		const newAlert = await Alert.create({
			alert_id: `ALERT-${Date.now()}-${uniqueIdSeed++}`,
			car_id: alertData.carId,
			alert_type: alertData.type,
			sound_classification: alertData.classification,
			confidence_score: alertData.confidence,
			status: "Active",
		});
		console.log(
			`[DB] Logged new alert: ${newAlert.alert_type} for ${newAlert.car_id}`
		);
		return newAlert.toObject();
	} catch (error) {
		console.error(
			`[DB] Failed to log alert for ${alertData.carId}:`,
			error
		);
		throw new Error("Database write failed");
	}
}

/** Get cars owned by a specific user (multi-tenant filtering) */
async function getCarsByUserId(userId) {
	const result = await pgPool.query(
		'SELECT * FROM smart_cars WHERE user_id = $1',
		[userId]
	);
	return result.rows;
}

/** Check if user owns a specific car (authorization helper) */
async function userOwnsCar(userId, carId) {
	const result = await pgPool.query(
		'SELECT 1 FROM smart_cars WHERE car_id = $1 AND user_id = $2',
		[carId, userId]
	);
	return result.rows.length > 0;
}

/** Registers a new IoT device in PostgreSQL. */
async function registerDevice(data) {
	const deviceId = data.deviceId || `IOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
	const mqttClientId = `mqtt_client_${deviceId}`;
	
	// Basic certificate validation
	if (data.certificate) {
		if (!validateDeviceCertificate(data.certificate)) {
			throw new Error("Invalid device certificate provided.");
		}
	}
	
	// Verify the car exists before assigning device
	const car = await getSmartCarById(data.carId);
	if (!car) {
		throw new Error(`Car with ID ${data.carId} does not exist.`);
	}
	
	const result = await pgPool.query(
		`INSERT INTO iot_devices (device_id, car_id, device_type, status, firmware_version, certificate_data, mqtt_client_id, last_heartbeat, connection_quality)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
		[
			deviceId,
			data.carId,
			data.deviceType,
			"Offline", // Default status
			data.firmwareVersion || "1.0.0",
			data.certificate || null,
			mqttClientId,
			new Date(),
			JSON.stringify({ latency: 0, signalStrength: 0, packetLoss: 0 })
		]
	);
	console.log(`[DB] Registered new IoT device: ${result.rows[0].device_id} for car ${data.carId}`);
	return result.rows[0];
}

/** Validates device X.509 certificate format and structure */
function validateDeviceCertificate(certificate) {
	if (!certificate || typeof certificate !== 'string') {
		return false;
	}
	
	// Basic certificate format validation
	const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/;
	if (!certRegex.test(certificate)) {
		return false;
	}
	
	// Additional validation could include:
	// - Certificate expiration check
	// - CA signature validation  
	// - Certificate chain verification
	// For now, we'll accept properly formatted certificates
	
	console.log(`[Security] Certificate validated for device registration`);
	return true;
}

/** Retrieves a device record from PostgreSQL. */
async function getDeviceById(deviceId) {
	const result = await pgPool.query(
		'SELECT * FROM iot_devices WHERE device_id = $1',
		[deviceId]
	);
	return result.rows[0] || null;
}

/** Retrieves devices by car ID from PostgreSQL. */
async function getDevicesByCarId(carId) {
	const result = await pgPool.query(
		'SELECT * FROM iot_devices WHERE car_id = $1 ORDER BY created_at DESC',
		[carId]
	);
	return result.rows;
}

/** Updates a device's status and connection info in PostgreSQL. */
async function updateDeviceStatus(deviceId, status, connectionQuality) {
	const query = `
		UPDATE iot_devices
		SET status = $1,
			connection_quality = $2,
			last_heartbeat = NOW(),
			updated_at = NOW()
		WHERE device_id = $3
		RETURNING *;
	`;
	const result = await pgPool.query(query, [
		status,
		JSON.stringify(connectionQuality || {}),
		deviceId
	]);
	return result.rows[0];
}

// --- MQTT Event Handlers (Phase 2: Real-time Connectivity) ---

/**
 * Set up event handlers for MQTT service events
 * Bridges MQTT events to database updates and WebSocket broadcasts
 */
function setupMQTTEventHandlers() {
	console.log("[MQTT] Setting up event handlers...");

	// Device heartbeat received
	mqttService.on('device_heartbeat', async (data) => {
		const { deviceId, connectionQuality } = data;
		try {
			const updatedDevice = await updateDeviceStatus(
				deviceId,
				'Online',
				connectionQuality
			);
			if (updatedDevice) {
				// Broadcast to dashboard
				broadcastDeviceStatus(updatedDevice);
			}
		} catch (error) {
			console.error(`[MQTT] Error updating heartbeat for ${deviceId}:`, error.message);
		}
	});

	// Device telemetry received
	mqttService.on('device_telemetry', async (data) => {
		const { deviceId, data: telemetryData } = data;
		try {
			// Update device status to Online
			const updatedDevice = await updateDeviceStatus(
				deviceId,
				'Online',
				telemetryData.connectionQuality || {}
			);

			// If telemetry includes car location, update the car record
			if (telemetryData.lat && telemetryData.lon && updatedDevice) {
				const updatedCar = await updateCarTelemetry(
					updatedDevice.car_id,
					telemetryData.lat,
					telemetryData.lon,
					'Online'
				);
				if (updatedCar) {
					broadcastCarStatus(updatedCar);
				}
			}

			// Broadcast device status update
			if (updatedDevice) {
				broadcastDeviceStatus(updatedDevice);
			}
		} catch (error) {
			console.error(`[MQTT] Error processing telemetry for ${deviceId}:`, error.message);
		}
	});

	// Device event received (audio events, alerts, etc.)
	mqttService.on('device_event', async (data) => {
		const { deviceId, eventType, eventData } = data;
		try {
			const device = await getDeviceById(deviceId);
			if (!device) {
				console.warn(`[MQTT] Device ${deviceId} not found in database`);
				return;
			}

			// Handle audio events
			if (eventType === 'audio_event' || eventData.type === 'audio_event') {
				const newAlert = await logAudioAlert({
					carId: device.car_id,
					type: eventData.event || eventData.alert_type || 'Unknown Event',
					classification: eventData.classification || eventData.sound_classification,
					confidence: eventData.confidence || eventData.confidence_score || 0
				});
				broadcastAlert(newAlert);
			}
		} catch (error) {
			console.error(`[MQTT] Error processing event for ${deviceId}:`, error.message);
		}
	});

	// Device connected
	mqttService.on('device_connected', async (data) => {
		const { deviceId } = data;
		console.log(`[MQTT] Device ${deviceId} connected`);
		try {
			const updatedDevice = await updateDeviceStatus(deviceId, 'Online', {});
			if (updatedDevice) {
				broadcastDeviceStatus(updatedDevice);
			}
		} catch (error) {
			console.error(`[MQTT] Error handling connection for ${deviceId}:`, error.message);
		}
	});

	// Device disconnected
	mqttService.on('device_disconnected', async (data) => {
		const { deviceId } = data;
		console.log(`[MQTT] Device ${deviceId} disconnected`);
		try {
			const updatedDevice = await updateDeviceStatus(deviceId, 'Offline', {});
			if (updatedDevice) {
				broadcastDeviceStatus(updatedDevice);
			}
		} catch (error) {
			console.error(`[MQTT] Error handling disconnection for ${deviceId}:`, error.message);
		}
	});

	// Device state changed (Online -> Idle -> Offline -> No-Connection)
	mqttService.on('device_state_changed', async (data) => {
		const { deviceId, newState } = data;
		console.log(`[MQTT] Device ${deviceId} state changed to ${newState}`);
		try {
			const updatedDevice = await updateDeviceStatus(deviceId, newState, {});
			if (updatedDevice) {
				broadcastDeviceStatus(updatedDevice);
			}
		} catch (error) {
			console.error(`[MQTT] Error handling state change for ${deviceId}:`, error.message);
		}
	});

	console.log("[MQTT] Event handlers configured successfully.");
}

// --- REST API Endpoints (Mounting the Routers) ---

const dependencies = {
	User,
	Alert,
	pgPool,
	authMiddleware,
	adminMiddleware,
	registerUser,
	registerSmartCar,
	getSmartCarById,
	getCarsByUserId,
	userOwnsCar,
	updateCarTelemetry,
	logAudioAlert,
	registerDevice,
	getDeviceById,
	getDevicesByCarId,
	updateDeviceStatus,
	mqttService,
	JWT_SECRET,
	bcrypt,
	jwt,
};
// 1. Authentication routes: /api/auth
app.use("/api/auth", authRouter(dependencies));

// 2. Car management routes: /api/cars
app.use("/api/cars", carRouter(dependencies));

// 3. Alert retrieval routes: /api/alerts
app.use("/api/alerts", alertRouter(dependencies));

// 4. Device management routes: /api/devices
app.use("/api/devices", deviceRouter(dependencies));

// // 5. Stats/Analytics routes: /api/stats
// app.use("/api/stats", statsRouter(dependencies));

// // 6. User management routes: /api/users (admin only)
// app.use("/api/users", userRouter(dependencies));

// --- WebSocket Server (For CARLA/IoT Real-Time Data Ingestion) ---

wss.on("connection", (ws, req) => {
	console.log("[WS] New CARLA Agent Connected.");

	// IMPORTANT: In a real environment, you'd authenticate the car agent using a unique key/token
	let carId = "CAR1000"; // Assuming a default car for unauthenticated agents
	let connectedCar = null;

	ws.on("message", (message) => {
		(async () => {
			try {
				const data = JSON.parse(message);

				if (!connectedCar) {
					connectedCar = await getSmartCarById(carId);
					if (connectedCar) {
						console.log(
							`[WS] Agent identified as ${carId}. Status set to Online.`
						);
						ws.send(
							JSON.stringify({
								status: "Connected",
								carId: carId,
							})
						);
					} else {
						console.error(
							`[WS] Could not find registered car ${carId}. Closing connection.`
						);
						ws.close();
						return;
					}
				}

				// --- Core Logic: Process Incoming Data ---

				// A. Handle Telemetry (Location/Heartbeat)
				if (data.type === "telemetry") {
					const updatedCar = await updateCarTelemetry(
						carId,
						data.lat,
						data.lon,
						"Online"
					);

					// Send updated status to all connected web dashboards (React)
					broadcastCarStatus(updatedCar);
				}

				// B. Handle Audio Event Detection
				if (data.type === "audio_event") {
					const newAlert = await logAudioAlert({
						carId,
						type: data.event,
						classification: data.classification,
						confidence: data.confidence,
					});

					// Immediately notify frontend dashboards of the critical alert
					broadcastAlert(newAlert);
				}
			} catch (error) {
				console.error(
					"[WS] Error processing message/DB:",
					error.message
				);
			}
		})();
	});

	ws.on("close", async () => {
		if (connectedCar && connectedCar.car_id) {
			await updateCarTelemetry(
				connectedCar.car_id,
				connectedCar.current_latitude,
				connectedCar.current_longitude,
				"Offline"
			);
			console.log(
				`[WS] Agent ${connectedCar.car_id} disconnected. Status set to Offline.`
			);
			broadcastCarStatus({ ...connectedCar, status: "Offline" });
		}
	});
});

// --- Real-time Broadcast Functions (For React Frontend Updates) ---

/** Broadcasts updated car status to all connected WebSocket clients (dashboards). */
function broadcastCarStatus(carData) {
	const payload = JSON.stringify({
		topic: "car_status_update",
		data: {
			car_id: carData.car_id,
			status: carData.status,
			lat: carData.current_latitude,
			lon: carData.current_longitude,
			heartbeat: carData.last_heartbeat,
		},
	});
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	});
}

/** Broadcasts a new critical alert to all connected WebSocket clients (dashboards). */
function broadcastAlert(alertData) {
	const payload = JSON.stringify({
		topic: "new_alert",
		data: alertData,
	});
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	});
}

/** Broadcasts device status updates to all connected WebSocket clients (dashboards). */
function broadcastDeviceStatus(deviceData) {
	const payload = JSON.stringify({
		topic: "device_status_update",
		data: {
			device_id: deviceData.device_id,
			car_id: deviceData.car_id,
			status: deviceData.status,
			connection_quality: deviceData.connection_quality,
			last_heartbeat: deviceData.last_heartbeat,
			firmware_version: deviceData.firmware_version,
		},
	});
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	});
}

// --- Start Server ---
server.listen(PORT, () => {
	console.log(`\n--- Smart Car Backend Running ---`);
	console.log(`REST API running on http://localhost:${PORT}`);
	console.log(`WebSocket Server running on ws://localhost:${PORT}`);
	console.log(`Mongo URI: ${MONGO_URI}`);
	console.log(
		`PostgreSQL DB: ${PG_CONFIG.database} on port ${PG_CONFIG.port}`
	);
});
