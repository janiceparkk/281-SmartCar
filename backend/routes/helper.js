// routes/helper.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
	// Get token from header
	const authHeader = req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ message: "No token, authorization denied." });
	}

	const token = authHeader.replace("Bearer ", "").trim();

	if (!token) {
		return res
			.status(401)
			.json({ message: "No token, authorization denied." });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
		res.status(400).json({ message: "Invalid token." });
	}
};

module.exports = { authMiddleware };
