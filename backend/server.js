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
app.use(
	cors({
		origin: process.env.FRONTEND_URL || "http://localhost:3000",
		credentials: true,
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

const jwt = require("jsonwebtoken");

// --- OIDC Routes ---
app.get("/auth/google", passport.authenticate("google"));

app.get(
	"/auth/google/callback",
	passport.authenticate("google", {
		session: false,
		failureRedirect: "/login",
	}),
	(req, res) => {
		const token = jwt.sign(
			{
				id: req.user.id,
				email: req.user.email,
				name: req.user.name,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "1d" }
		);

		res.redirect(
			`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?token=${token}`
		);
	}
);

// --- Auth Check Middleware ---
const requireJWTAuth = (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).json({ error: "No token provided" });
	}

	const token = authHeader.split(" ")[1];
	if (!token) {
		return res.status(401).json({ error: "Invalid token format" });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded; // e.g. { id, role }
		next();
	} catch (err) {
		return res.status(403).json({ error: "Invalid or expired token" });
	}
};

// --- User Info Endpoint ---
app.get("/auth/user", (req, res) => {
	if (req.isAuthenticated()) {
		res.json({
			user: req.user,
			isAuthenticated: true,
		});
	} else {
		res.json({
			user: null,
			isAuthenticated: false,
		});
	}
});

// --- Logout Endpoint ---
app.post("/auth/logout", (req, res) => {
	req.logout((err) => {
		if (err) {
			return res.status(500).json({ error: "Logout failed" });
		}
		res.json({ message: "Logged out successfully" });
	});
});

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
		console.log("✅ Connected to PostgreSQL successfully.");
		client.release();
	})
	.catch((err) => {
		console.error("❌ Failed to connect to PostgreSQL:", err.message);
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

// --- Public Routes ---
app.use("/api/auth", authRouter);

// --- WebSocket with Authentication (Optional) ---
wss.on("connection", (ws, req) => {
	// You can add authentication to WebSocket connections here
	console.log("[WS] New client connected");

	ws.on("message", (message) => {
		// Handle messages
	});
});

// --- Start Server ---
server.listen(PORT, () => {
	console.log(`\n--- Smart Car Backend Running ---`);
	console.log(`REST API running on http://localhost:${PORT}`);
	console.log(`WebSocket Server running on ws://localhost:${PORT}`);
	console.log(`Mongo URI: ${MONGO_URI}`);
	console.log(
		`PostgreSQL DB: ${process.env.PG_DATABASE} on port ${process.env.PG_PORT}`
	);
});
