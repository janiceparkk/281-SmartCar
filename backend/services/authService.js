const passport = require("passport");
const jwt = require("jsonwebtoken");
const WebSocket = require("ws");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
	console.error(
		"CRITICAL ERROR: JWT_SECRET environment variable is not set."
	);
	process.exit(1);
}

// Google OAuth Authentication
const googleAuth = passport.authenticate("google", {
	scope: ["profile", "email"],
});

const googleAuthCallback = (req, res, next) => {
	passport.authenticate("google", (err, user) => {
		if (err || !user) {
			return res.redirect("/login?error=auth_failed");
		}

		req.login(user, (loginErr) => {
			if (loginErr) {
				return next(loginErr);
			}

			const token = jwt.sign(
				{
					id: user.id,
					email: user.email,
					pgId: user.pg_user_id,
				},
				JWT_SECRET,
				{
					expiresIn: "1h",
				}
			);

			const frontendUrl =
				process.env.FRONTEND_URL?.split(",")[0]?.trim() ||
				"http://localhost:3000";
			res.redirect(`${frontendUrl}/login?token=${token}`);
		});
	})(req, res, next);
};

// JWT Authentication Middleware
const requireJWTAuth = (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const token = authHeader.split(" ")[1];
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (err) {
		res.status(401).json({ error: "Invalid or expired token" });
	}
};

// Get User Info
const getUserInfo = (req, res) => {
	if (!req.user) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	res.json({ user: req.user });
};

// Logout
const logout = (req, res) => {
	req.logout((err) => {
		if (err) {
			return res.status(500).json({ error: "Failed to log out" });
		}
		res.json({ message: "Logged out successfully" });
	});
};

// WebSocket Authentication
const handleWebSocketConnection = (ws, req) => {
	ws.on("message", (message) => {
		try {
			const { token } = JSON.parse(message);
			const decoded = jwt.verify(token, JWT_SECRET);
			ws.user = decoded;
			ws.send(JSON.stringify({ message: "Authenticated" }));
		} catch (err) {
			ws.send(JSON.stringify({ error: "Invalid or expired token" }));
			ws.close();
		}
	});
};

module.exports = {
	googleAuth,
	googleAuthCallback,
	requireJWTAuth,
	getUserInfo,
	logout,
	handleWebSocketConnection,
};
