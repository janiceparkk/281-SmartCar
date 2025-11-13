require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const mongoose = require("mongoose");
const { Pool } = require("pg");

// Import Route Modules
const authRouter = require("./routes/authRoutes");
const carRouter = require("./routes/carRoutes");
const alertRouter = require("./routes/alertRoutes");
const deviceRouter = require("./routes/deviceRoutes");

// Import Services
const mqttService = require("./services/mqttService");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Configuration ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	console.error(
		"CRITICAL ERROR: JWT_SECRET environment variable is not set."
	);
	process.exit(1);
}

// PostgreSQL Pool
const pgPool = new Pool({
	user: process.env.PG_USER,
	host: process.env.PG_HOST,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
	port: process.env.PG_PORT,
});

pgPool
	.connect()
	.then((client) => {
		console.log("Connected to PostgreSQL successfully.");
		client.release();
	})
	.catch((err) => {
		console.error("Failed to connect to PostgreSQL:", err.message);
	});

// --- Database Middleware ---
app.use((req, res, next) => {
	req.db = {
		pgPool,
		mongoose,
		JWT_SECRET: process.env.JWT_SECRET,
	};
	next();
});

// --- Routes ---
app.use("/api/auth", authRouter);
app.use("/api/cars", carRouter);
app.use("/api/devices", deviceRouter);
// app.use("/api/alerts", alertRouter);

// --- WebSocket Server (For CARLA/IoT Real-Time Data Ingestion) ---
//  Just a AI gen Place holder, will need IoT part will handle this
wss.on("connection", (ws, req) => {
	console.log("[WS] New CARLA Agent Connected.");

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
//  Just a AI gen Place holder, will need IoT part will handle this
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
//  Just a AI gen Place holder, will need IoT part will handle this

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
server.listen(PORT, async () => {
	console.log(`\n--- Smart Car Backend Running ---`);
	console.log(`REST API running on http://localhost:${PORT}`);
	console.log(`WebSocket Server running on ws://localhost:${PORT}`);
	console.log(`Mongo URI: ${MONGO_URI}`);
	console.log(
		`PostgreSQL DB: ${process.env.PG_DATABASE} on port ${process.env.PG_PORT}`
	);

	// Initialize MQTT Service
	try {
		await mqttService.initialize();
		console.log(`MQTT Service initialized`);
	} catch (error) {
		console.error(`MQTT Service initialization failed:`, error.message);
		console.log(`(Server will continue without MQTT support)`);
	}
});
