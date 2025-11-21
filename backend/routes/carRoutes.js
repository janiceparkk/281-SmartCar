const express = require("express");
const router = express.Router();
const { pgPool } = require("../config/database");
const { authMiddleware } = require("./helper");
const { registerSmartCar } = require("../services/carService");

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
		const userId = req.user.id;

		// Remove the userRole check from here, let registerSmartCar handle it
		const newCar = await registerSmartCar(req.body, userId);

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

// GET /api/cars/carla  (Get user's cars mapped with CARLA bridge)
router.get("/carla", async (req, res) => {
	try {
		const userId = req.user.id;
		const CARLA_BRIDGE_URL =
			process.env.CARLA_BRIDGE_URL || "http://localhost:5001";

		// Get user's cars from PostgreSQL
		const userCarsResult = await pgPool.query(
			'SELECT * FROM "smart_cars" WHERE user_id = $1',
			[userId]
		);

		const userCars = userCarsResult.rows;

		// Get active cars from CARLA bridge
		let carlaActiveCars = [];
		try {
			const carlaResponse = await fetch(`${CARLA_BRIDGE_URL}/car-list`);
			if (carlaResponse.ok) {
				carlaActiveCars = await carlaResponse.json();
			}
		} catch (error) {
			console.error("Error fetching CARLA car list:", error);
			// Continue even if CARLA bridge is unavailable
		}

		// Map PostgreSQL cars with CARLA cars
		// Use license_plate as the CARLA car_id mapping
		const mappedCars = userCars
			.filter((car) => {
				// Only include cars that have a license_plate (used as CARLA car_id)
				// and are active in CARLA bridge
				const carlaCarId = car.license_plate;
				return carlaCarId && carlaActiveCars.includes(carlaCarId);
			})
			.map((car) => ({
				...car,
				carla_car_id: car.license_plate, // The CARLA car_id
				is_active_in_carla: true,
			}));

		res.json(mappedCars);
	} catch (error) {
		console.error("Error fetching user CARLA cars:", error);
		res.status(500).json({
			message: "Failed to retrieve user CARLA cars.",
		});
	}
});

module.exports = router;
