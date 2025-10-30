const express = require("express");
const router = express.Router();

/**
 * Initializes and returns the Authentication Router.
 * @param {object} dependencies - Object containing necessary services, models, and constants.
 * @param {object} dependencies.User - Mongoose User Model.
 * @param {object} dependencies.pgPool - PostgreSQL connection pool.
 * @param {function} dependencies.registerUser - Service function to register a new user.
 * @param {function} dependencies.registerSmartCar - Service function to register a car.
 * @param {string} dependencies.JWT_SECRET - Secret key for JWT signing.
 * @param {object} dependencies.bcrypt - bcryptjs library instance.
 * @param {object} dependencies.jwt - jsonwebtoken library instance.
 */
module.exports = function authRouter({
	User,
	pgPool,
	registerUser,
	registerSmartCar,
	JWT_SECRET,
	bcrypt,
	jwt,
}) {
	// Registration: POST /api/auth/register
	router.post("/register", async (req, res) => {
		try {
			const { email, password, name, role } = req.body;
			const newUser = await registerUser({ email, password, name, role });

			// Optional: Auto-register a car for a new CarOwner
			if (newUser.role === "CarOwner") {
				await registerSmartCar({
					user_id: newUser.id,
					model: "New Autonomous Car",
				});
			}

			res.status(201).json({
				message: "User registered successfully.",
				user: {
					id: newUser.id,
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

	// Login: POST /api/auth/login
	router.post("/login", async (req, res) => {
		try {
			const { email, password } = req.body;

			const user = await User.findOne({ email });
			if (!user) {
				return res
					.status(401)
					.json({ message: "Invalid credentials." });
			}

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				return res
					.status(401)
					.json({ message: "Invalid credentials." });
			}

			// Generate JWT token
			const token = jwt.sign(
				{ id: user.user_id, role: user.role },
				JWT_SECRET,
				{ expiresIn: "1h" } // Token expires in 1 hour
			);

			// Fetch associated car (for CarOwner dashboard convenience)
			let associatedCar = null;
			if (user.role === "CarOwner") {
				const result = await pgPool.query(
					'SELECT car_id FROM "SMART_CARS" WHERE user_id = $1',
					[user.user_id]
				);
				associatedCar = result.rows[0];
			}

			return res.json({
				token,
				user: {
					id: user.user_id,
					name: user.name,
					email: user.email,
					role: user.role,
				},
				car_id: associatedCar ? associatedCar.car_id : null,
			});
		} catch (error) {
			console.error("Login Error:", error.message);
			res.status(500).json({
				message: "Login failed due to server error.",
			});
		}
	});

	return router;
};
