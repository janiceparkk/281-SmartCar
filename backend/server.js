require("dotenv").config();

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const mongoose = require("mongoose");
const { Pool } = require("pg");
const session = require("express-session");
const passport = require("./config/passport"); // Your passport config

// Import Route Modules
const authRouter = require("./routes/authRoutes");
const carRouter = require("./routes/carRoutes");
const alertRouter = require("./routes/alertRoutes");
const deviceRouter = require("./routes/deviceRoutes");
const serviceRequestRouter = require("./routes/serviceRequestRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRouter = require("./routes/aiRoutes");

// Import Services
const mqttService = require("./services/mqttService");
const authService = require("./services/authService");

const app = express();

// --- Session Configuration ---
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
		},
	})
);

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- CORS Configuration ---
// Allow multiple origins for development (localhost on different ports)
const allowedOrigins = process.env.FRONTEND_URL
	? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
	: [
			"http://localhost:3000",
			"http://localhost:3001",
			"http://localhost:5173", // Vite default port
		];

app.use(
	cors({
		origin: (origin, callback) => {
			// Allow requests with no origin (like mobile apps, Postman, etc.)
			if (!origin) return callback(null, true);

			// Check if origin is in allowed list
			if (allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				// In development, allow any localhost origin
				if (
					process.env.NODE_ENV !== "production" &&
					origin.startsWith("http://localhost:")
				) {
					callback(null, true);
				} else {
					callback(new Error("Not allowed by CORS"));
				}
			}
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Service-Token",
			"X-Requested-With",
		],
	})
);

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

// --- OIDC Routes ---
app.get("/auth/google", authService.googleAuth);
app.get("/auth/google/callback", authService.googleAuthCallback);

// --- Auth Check Middleware ---
const requireJWTAuth = authService.requireJWTAuth;

// --- User Info Endpoint ---
app.get("/auth/user", authService.getUserInfo);

// --- Logout Endpoint ---
app.post("/auth/logout", authService.logout);

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

mongoose
	.connect(MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("✅ Connected to MongoDB successfully"))
	.catch((err) => {
		console.error("❌ Failed to connect to MongoDB:", err.message);
		process.exit(1);
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

// --- Protected Routes ---
app.use("/api/cars", requireJWTAuth, carRouter);
app.use("/api/devices", requireJWTAuth, deviceRouter);
app.use("/api/serviceRequests", requireJWTAuth, serviceRequestRouter);
app.use("/api/user", requireJWTAuth, userRoutes);
app.use("/api/ai", aiRouter); // AI routes handle their own auth (JWT or service token)

// --- Public Routes ---
app.use("/api/auth", authRouter);
app.use("/api/alerts", alertRouter);

// --- WebSocket with Authentication (Optional) ---
wss.on("connection", authService.handleWebSocketConnection);

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
