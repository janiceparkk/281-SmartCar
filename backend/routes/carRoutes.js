const express = require("express");
const router = express.Router();
const { pgPool } = require("../config/database");
const { authMiddleware } = require("./helper");
const { registerSmartCar } = require("../services/carService");

router.use((req, res, next) => {
	const authHeader = req.header("Authorization");
	next();
});

router.use(authMiddleware);

// GET /api/cars
router.get("/", async (req, res) => {
	try {
		const result = await pgPool.query('SELECT * FROM "smart_cars"');
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching cars:", error);
		res.status(500).json({
			message: "Failed to retrieve cars from database.",
		});
	}
});

// GET /api/cars/active
router.get("/active", async (req, res) => {
	try {
		let query = "";
		let params = ["active"];

		query = `
			SELECT sc.*, u.name as owner_name, u.email as owner_email 
			FROM smart_cars sc 
			JOIN users u ON sc.user_id = u.user_id
			WHERE sc.status = $1
			ORDER BY sc.car_id
		`;
		const result = await pgPool.query(query, params);
		return res.json(result.rows);
	} catch (error) {
		console.error("Error fetching active cars:", error);
		res.status(500).json({
			message: "Failed to retrieve active cars from database.",
		});
	}
});

// GET /api/cars/user/:userId
router.get("/user/:userId", async (req, res) => {
	try {
		const userId = req.params.userId;
		const result = await pgPool.query(
			'SELECT * FROM "smart_cars" WHERE user_id = $1',
			[userId]
		);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching user cars:", error);
		res.status(500).json({
			message: "Failed to retrieve user cars from database.",
		});
	}
});

// POST /api/cars (register new car)
router.post("/", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;

		if (userRole === "CarOwner") {
			if (req.body.user_id && req.body.user_id !== userId) {
				return res.status(403).json({
					message: "Not authorized to register cars for other users",
				});
			}

			req.body.user_id = userId;
		}

		if (userRole === "Admin") {
			if (!req.body.user_id) {
				return res.status(400).json({
					message: "user_id required when registering as Admin",
				});
			}
		}

		const newCar = await registerSmartCar(req.body, userRole, userId);

		res.status(201).json(newCar);
	} catch (error) {
		console.error("Error registering car:", error);
		res.status(500).json({
			message: error.message || "Failed to register car.",
		});
	}
});

// GET /api/cars/user  (Get cars for authenticated user)
router.get("/user", async (req, res) => {
	try {
		const userId = req.user.id;

		const result = await pgPool.query(
			'SELECT * FROM "smart_cars" WHERE user_id = $1',
			[userId]
		);

		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching user cars:", error);
		res.status(500).json({
			message: "Failed to retrieve user cars from database.",
		});
	}
});

module.exports = router;
