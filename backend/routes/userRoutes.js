const express = require("express");
const router = express.Router();
const { OIDCUser } = require("./mongoSchema");
const { pgPool } = require("../config/database");

// GET /api/user/profile
router.get("/profile", async (req, res) => {
	try {
		console.log("/profile hit", req.user);
		const { email } = req.user;
		let user = null;
		let pgUserId = null;
		let cars = [];

		const mongoUser = await OIDCUser.findOne({ email }).lean();

		if (mongoUser && mongoUser.pg_user_id) {
			pgUserId = mongoUser.pg_user_id;
		}

		let userQuery, userParams;

		if (pgUserId) {
			userQuery = `
                SELECT u.user_id AS id, u.name, u.email, r.role_name AS role,
                       COALESCE(u.profile_data, '{}'::jsonb) AS profile_data
                FROM users u
                JOIN user_roles r ON u.role_id = r.role_id
                WHERE u.user_id = $1`;
			userParams = [pgUserId];
		} else {
			userQuery = `
                SELECT u.user_id AS id, u.name, u.email, r.role_name AS role,
                       COALESCE(u.profile_data, '{}'::jsonb) AS profile_data
                FROM users u
                JOIN user_roles r ON u.role_id = r.role_id
                WHERE u.email = $1`;
			userParams = [email];
		}

		const userResult = await req.db.pgPool.query(userQuery, userParams);

		if (userResult.rows.length === 0) {
			if (mongoUser) {
				user = {
					id: null,
					name: mongoUser.name,
					email: mongoUser.email,
					role: "CarOwner", // Default role
					profile_data: mongoUser.profile_data || {},
				};
			} else {
				return res.status(404).json({ message: "User not found" });
			}
		} else {
			user = userResult.rows[0];
			pgUserId = user.id;
		}

		if (pgUserId) {
			const carResult = await req.db.pgPool.query(
				`SELECT car_id, model, status
                 FROM smart_cars
                 WHERE user_id = $1`,
				[pgUserId]
			);
			cars = carResult.rows;
		}

		return res.json({ user, cars });
	} catch (error) {
		console.error("User profile fetch error:", error.message);
		return res
			.status(500)
			.json({ message: "Failed to fetch user profile" });
	}
});

// PUT /api/user/profile
router.put("/profile", async (req, res) => {
	try {
		const { email, provider } = req.user;
		const { name, phone, company_name, ...profileFields } = req.body;

		if (provider === "google") {
			const updateData = { name, role: "CarOwner", ...profileFields };
			const updatedUser = await OIDCUser.findOneAndUpdate(
				{ email },
				updateData,
				{ new: true }
			).lean();

			if (!updatedUser)
				return res.status(404).json({ message: "User not found" });

			return res.json({ user: updatedUser });
		} else {
			// Merge incoming profile_data safely with existing JSONB
			const result = await req.db.pgPool.query(
				`UPDATE users
         SET name = $1,
             phone = $2,
             company_name = $3,
             profile_data = COALESCE(profile_data, '{}'::jsonb) || $4::jsonb
         WHERE email = $5
         RETURNING user_id AS id, name, email, profile_data`,
				[
					name,
					phone,
					company_name,
					JSON.stringify(profileFields.profile_data || {}),
					email,
				]
			);

			if (result.rows.length === 0)
				return res.status(404).json({ message: "User not found" });

			const updatedUser = result.rows[0];
			updatedUser.role = "CarOwner"; // or fetch from role join if needed

			return res.json({ user: updatedUser });
		}
	} catch (error) {
		console.error("User profile update error:", error.message);
		return res
			.status(500)
			.json({ message: "Failed to update user profile" });
	}
});

// GET /api/user - Get all users (admin only)
router.get("/", async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== "Admin") {
			return res.status(403).json({
				message: "Forbidden: Admin access required",
			});
		}

		const result = await pgPool.query(`
			SELECT u.user_id, u.name, u.email, u.user_type, u.phone, u.company_name,
				   ur.role_name, u.created_at, u.last_login
			FROM users u
			JOIN user_roles ur ON u.role_id = ur.role_id
			ORDER BY u.name
		`);

		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({
			message: "Failed to retrieve users from database.",
		});
	}
});

module.exports = router;
