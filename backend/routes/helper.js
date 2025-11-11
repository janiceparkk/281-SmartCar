// routes/helper.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
	// Get token from header
	const authHeader = req.header("Authorization");
	console.log("[AUTH DEBUG] Raw Authorization header:", authHeader);

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		console.log("[AUTH DEBUG] No Bearer token found");
		return res
			.status(401)
			.json({ message: "No token, authorization denied." });
	}

	const token = authHeader.replace("Bearer ", "").trim();
	console.log(
		"[AUTH DEBUG] Extracted token:",
		token.substring(0, 50) + "..."
	);
	console.log("[AUTH DEBUG] Token length:", token.length);

	if (!token) {
		console.log("[AUTH DEBUG] Token is empty after extraction");
		return res
			.status(401)
			.json({ message: "No token, authorization denied." });
	}

	try {
		console.log("[AUTH DEBUG] Verifying token with secret...");
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		console.log("[AUTH DEBUG] Token decoded successfully:", decoded);
		req.user = decoded;
		next();
	} catch (error) {
		console.error("[AUTH DEBUG] Token verification failed:", error.message);
		console.error("[AUTH DEBUG] Error details:", error);
		res.status(400).json({ message: "Invalid token." });
	}
};

module.exports = { authMiddleware };
