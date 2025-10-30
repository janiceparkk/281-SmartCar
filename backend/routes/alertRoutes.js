const express = require("express");
const router = express.Router();

/**
 * Initializes and returns the Alert Router.
 * @param {object} dependencies - Object containing necessary models and middleware.
 * @param {function} dependencies.authMiddleware - Middleware to verify JWT.
 * @param {object} dependencies.Alert - Mongoose Alert Model.
 */
module.exports = function alertRouter({ authMiddleware, Alert }) {
	// GET /api/alerts/latest (Protected)
	router.get("/latest", authMiddleware, async (req, res) => {
		try {
			// NOTE: In a complete app, this query would be filtered by cars owned by req.user.id
			const recentAlerts = await Alert.find({})
				.sort({ createdAt: -1 })
				.limit(10);
			res.json(recentAlerts);
		} catch (error) {
			console.error("Error fetching alerts:", error);
			res.status(500).json({
				message: "Failed to retrieve alerts from database.",
			});
		}
	});

	return router;
};
