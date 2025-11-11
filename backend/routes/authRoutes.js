const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Import services that use req.db internally
const {
	registerUser,
	authenticateUser,
	registerSmartCar,
} = require("../services");

router.post("/register", async (req, res) => {
	try {
		const { email, password, name, role, model } = req.body;

		const newUser = await registerUser({ email, password, name, role });

		if (newUser.role === "CarOwner" && model) {
			await registerSmartCar(
				{ model: model },
				newUser.role, 
				newUser.user_id 
			);
		}

		res.status(201).json({
			message: "User registered successfully.",
			user: {
				id: newUser.user_id,
				name: newUser.name,
				email: newUser.email,
				role: newUser.role,
			},
		});
	} catch (error) {
		console.error("Registration Error:", error.message);
		res.status(400).json({
			message: error.message.includes("exists")
				? error.message
				: "Registration failed.",
		});
	}
});

router.post("/login", async (req, res) => {
	try {
		console.log("[DEBUG] Login attempt for:", req.body.email);
		const { email, password } = req.body;

		const user = await authenticateUser(email, password);
		console.log(
			"[DEBUG] authenticateUser result:",
			user ? "User found" : "User not found"
		);

		if (!user) {
			return res.status(401).json({ message: "Invalid credentials." });
		}

		console.log("[DEBUG] Generating JWT token for user:", user.user_id);

		// Use JWT_SECRET from req.db
		const token = jwt.sign(
			{ id: user.user_id, role: user.role_name },
			req.db.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		console.log("[DEBUG] JWT token generated successfully");

		// Fetch cars using pgPool from req.db
		let userCars = [];
		if (user.role_name === "CarOwner") {
			try {
				console.log("[DEBUG] Fetching cars for user:", user.user_id);
				const result = await req.db.pgPool.query(
					"SELECT car_id, model, status FROM smart_cars WHERE user_id = $1",
					[user.user_id]
				);
				userCars = result.rows;
				console.log("[DEBUG] Found cars:", userCars.length);
			} catch (carError) {
				console.error("Error fetching user's cars:", carError.message);
			}
		}

		console.log("[DEBUG] Login successful, sending response");

		return res.json({
			token,
			user: {
				id: user.user_id,
				name: user.name,
				email: user.email,
				role: user.role_name,
			},
			cars: userCars,
		});
	} catch (error) {
		console.error("Login Error details:", error);
		console.error("Login Error stack:", error.stack);
		res.status(500).json({
			message: "Login failed due to server error.",
		});
	}
});


module.exports = router; 
