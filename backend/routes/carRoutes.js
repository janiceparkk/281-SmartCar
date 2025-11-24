const express = require("express");
const router = express.Router();
const { pgPool } = require("../config/database");
const { authMiddleware } = require("./helper");
const {
	registerSmartCar,
	updateCarDetails,
} = require("../services/carService");

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

// GET /api/cars/carla  (Get user's cars with CARLA bridge status)
// Returns all user cars from database, with optional CARLA connection status
router.get("/carla", async (req, res) => {
	try {
		const userId = req.user.id;
		if (!userId) {
			return res.status(401).json({
				message: "User ID not found. Please authenticate.",
			});
		}

		const CARLA_BRIDGE_URL =
			process.env.CARLA_BRIDGE_URL || "http://localhost:5001";

		// Get user's cars from PostgreSQL FIRST (this should always work)
		let userCars = [];
		try {
			const userCarsResult = await pgPool.query(
				'SELECT * FROM "smart_cars" WHERE user_id = $1 ORDER BY car_id',
				[userId]
			);
			userCars = userCarsResult.rows;
		} catch (dbError) {
			console.error("Database error fetching user cars:", dbError);
			return res.status(500).json({
				message: "Failed to retrieve cars from database.",
				error: dbError.message,
			});
		}

		// Try to get active cars from CARLA bridge (optional - don't fail if unavailable)
		let carlaActiveCars = [];
		let carlaAvailable = false;

		// Use a timeout wrapper for better compatibility
		const fetchWithTimeout = (url, timeout = 2000) => {
			return Promise.race([
				fetch(url),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error("Timeout")), timeout)
				),
			]);
		};

		try {
			const carlaResponse = await fetchWithTimeout(
				`${CARLA_BRIDGE_URL}/car-list`,
				2000
			);
			if (carlaResponse && carlaResponse.ok) {
				carlaActiveCars = await carlaResponse.json();
				carlaAvailable = true;
			}
		} catch (error) {
			// CARLA bridge is unavailable - continue without it
			console.log(
				`CARLA bridge unavailable (${error.message}), showing cars from database only`
			);
		}

		// Map all user cars with CARLA status
		// Use license_plate as the CARLA car_id mapping
		const mappedCars = userCars.map((car) => {
			const carlaCarId = car.license_plate;
			const isActiveInCarla =
				carlaAvailable &&
				carlaCarId &&
				Array.isArray(carlaActiveCars) &&
				carlaActiveCars.includes(carlaCarId);

			return {
				...car,
				carla_car_id: carlaCarId || null, // The CARLA car_id (if available)
				is_active_in_carla: isActiveInCarla,
				carla_available: carlaAvailable, // Indicates if CARLA bridge is reachable
			};
		});

		// Always return cars from database, even if CARLA is down
		return res.json(mappedCars);
	} catch (error) {
		console.error("Error in /api/cars/carla endpoint:", error);
		// Even on error, try to return cars from database if possible
		try {
			const userId = req.user?.id;
			if (userId) {
				const userCarsResult = await pgPool.query(
					'SELECT * FROM "smart_cars" WHERE user_id = $1 ORDER BY car_id',
					[userId]
				);
				const fallbackCars = userCarsResult.rows.map((car) => ({
					...car,
					carla_car_id: car.license_plate || null,
					is_active_in_carla: false,
					carla_available: false,
				}));
				return res.json(fallbackCars);
			}
		} catch (fallbackError) {
			console.error("Fallback also failed:", fallbackError);
		}

		return res.status(500).json({
			message: "Failed to retrieve user cars.",
			error: error.message,
		});
	}
});

// PUT /api/cars/:carId (update details)
router.put("/:carId", async (req, res) => {
	try {
		const userId = req.user.id;
		const carId = parseInt(req.params.carId, 10);

		if (Number.isNaN(carId)) {
			return res
				.status(400)
				.json({ message: "Invalid car ID. Expected a number." });
		}

		const updatedCar = await updateCarDetails(carId, req.body, userId);

		return res.json(updatedCar);
	} catch (error) {
		console.error("Error updating car:", error);
		res.status(500).json({
			message: error.message || "Failed to update car.",
		});
	}
});

module.exports = router;
