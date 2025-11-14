const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
	registerUser,
	authenticateUser,
	registerSmartCar,
} = require("../services");

router.post("/register", async (req, res) => {
	try {
		const { email, password, name, role, model } = req.body;
		const existing = await req.db.pgPool.query(
			"SELECT user_id FROM users WHERE email=$1",
			[email]
		);

		if (existing.rows.length > 0) {
			return res.status(400).json({ message: "User already exists." });
		}
		// Hash password, get role_id, etc. inside registerUser function
		// Here we also initialize profile_data with default values
		const defaultProfileData = {
			emailNotifications: true,
			pushNotifications: true,
			location: "",
			picture: "",
		};

		const newUser = await registerUser({
			email,
			password,
			name,
			role,
			profile_data: defaultProfileData, // <-- add defaults here
		});

		// If the new user is a CarOwner and has a model, register the car
		if (newUser.role === "CarOwner" && model) {
			await registerSmartCar({ model }, newUser.role, newUser.user_id);
		}

		res.status(201).json({
			message: "User registered successfully.",
			user: {
				id: newUser.user_id,
				name: newUser.name,
				email: newUser.email,
				role: newUser.role,
				profile_data: defaultProfileData, // include it in response
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
		const { email, password } = req.body;

		const user = await authenticateUser(email, password);

		if (!user) {
			return res.status(401).json({ message: "Invalid credentials." });
		}

		const token = jwt.sign(
			{
				id: user.user_id,
				role: user.role_name,
				email: user.email,
			},
			req.db.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		// Fetch cars using pgPool from req.db
		let userCars = [];
		if (user.role_name === "CarOwner") {
			try {
				const result = await req.db.pgPool.query(
					"SELECT car_id, model, status FROM smart_cars WHERE user_id = $1",
					[user.user_id]
				);
				userCars = result.rows;
			} catch (carError) {
				console.error("Error fetching user's cars:", carError.message);
			}
		}

		return res.json({
			token,
			user: {
				id: user.user_id,
				name: user.name,
				email: user.email,
				role: user.role_name,
				profile_data: user.profile_data || {},
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
