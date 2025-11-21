// routes/helper.js
const jwt = require("jsonwebtoken");
const { OIDCUser } = require("./mongoSchema");

const authMiddleware = async (req, res, next) => {
	const authHeader = req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ message: "No token, authorization denied." });
	}

	const token = authHeader.replace("Bearer ", "").trim();

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Check if the ID looks like a MongoDB ObjectId (24 hex characters)
		if (
			decoded.id &&
			decoded.id.length === 24 &&
			/^[0-9a-fA-F]+$/.test(decoded.id)
		) {
			// It's a MongoDB ID, look up the PostgreSQL ID
			const user = await OIDCUser.findById(decoded.id);
			if (user) {
				req.user = {
					...decoded,
					id: user.pg_user_id, // Replace with PostgreSQL ID
				};
			} else {
				return res.status(401).json({ message: "User not found." });
			}
		} else {
			// It's already a PostgreSQL ID (number or shorter string)
			req.user = decoded;
		}

		console.log("req.user", req.user);

		next();
	} catch (error) {
		res.status(400).json({ message: "Invalid token." });
	}
};

module.exports = { authMiddleware };
