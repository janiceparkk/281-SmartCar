const express = require("express");
const router = express.Router();

/**
 * Initializes and returns the Car Management Router.
 * @param {object} dependencies - Object containing necessary services, models, and middleware.
 * @param {function} dependencies.authMiddleware - Middleware to verify JWT.
 * @param {object} dependencies.pgPool - PostgreSQL connection pool.
 * @param {function} dependencies.registerSmartCar - Service function to register a car.
 */
module.exports = function carRouter({
	authMiddleware,
	pgPool,
	registerSmartCar,
}) {
	// GET /api/cars (Protected)
	router.get("/", authMiddleware, async (req, res) => {
		try {
			// NOTE: In a complete app, this query would be filtered by req.user.id for CarOwners
			const result = await pgPool.query('SELECT * FROM "SMART_CARS"');
			res.json(result.rows);
		} catch (error) {
			console.error("Error fetching cars:", error);
			res.status(500).json({
				message: "Failed to retrieve cars from database.",
			});
		}
	});

	// POST /api/cars (Protected)
	router.post("/", authMiddleware, async (req, res) => {
		try {
			// Security check: CarOwner can only register cars for themselves
			if (
				req.user.role === "CarOwner" &&
				req.body.user_id &&
				req.body.user_id !== req.user.id
			) {
				return res.status(403).json({
					message: "Not authorized to register cars for other users.",
				});
			}

			// Use user_id from token if not explicitly provided (or if CarOwner)
			const userId =
				req.user.role === "CarOwner" ? req.user.id : req.body.user_id;

			if (!userId) {
				return res.status(400).json({
					message: "User ID required for car registration.",
				});
			}

			const newCar = await registerSmartCar({
				...req.body,
				user_id: userId,
			});
			res.status(201).json(newCar);
		} catch (error) {
			res.status(500).json({
				message: "Failed to register car.",
				error: error.message,
			});
		}
	});

	return router;
};
