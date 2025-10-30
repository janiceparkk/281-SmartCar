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

// --- MongoDB Schemas and Models ---

const AlertSchema = new mongoose.Schema(
	{
		car_id: { type: String, required: true, index: true },
		alert_id: { type: String, required: true, unique: true },
		alert_type: { type: String, required: true },
		sound_classification: { type: String },
		confidence_score: { type: Number, required: true },
		status: { type: String, default: "Active", index: true },
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

// --- Core Database Services (Used by Routes and WS) ---

/** Registers a new smart car/device in PostgreSQL. */
async function registerSmartCar(data) {
	const carId = data.carId || `CAR${Math.floor(Math.random() * 10000)}`;
	const result = await pgPool.query(
		`INSERT INTO "SMART_CARS" (car_id, user_id, model, status, last_heartbeat)
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
        CREATE TABLE IF NOT EXISTS "SMART_CARS" (
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
			'SELECT COUNT(*) FROM "SMART_CARS" WHERE car_id = $1',
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

/** Retrieves a car record from PostgreSQL. */
async function getSmartCarById(carId) {
	const result = await pgPool.query(
		'SELECT * FROM "SMART_CARS" WHERE car_id = $1',
		[carId]
	);
	return result.rows[0] || null;
}

/** Updates a car's real-time telemetry and status in PostgreSQL. */
async function updateCarTelemetry(carId, lat, lon, status) {
	const query = `
        UPDATE "SMART_CARS"
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

// --- REST API Endpoints (Mounting the Routers) ---

const dependencies = {
	User,
	Alert,
	pgPool,
	authMiddleware,
	registerUser,
	registerSmartCar,
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
