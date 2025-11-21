const express = require("express");
const router = express.Router();
const { OIDCUser } = require("./mongoSchema");

// GET /api/user/profile
router.get("/profile", async (req, res) => {
	try {
		const { email, provider } = req.user;

		let user,
			cars = [];

		if (provider === "google") {
			user = await OIDCUser.findOne({ email }).lean();
			if (!user)
				return res.status(404).json({ message: "User not found" });
			user.role = "CarOwner";
			user.profile_data = user.profile_data || {};
		} else {
			const result = await req.db.pgPool.query(
				`SELECT u.user_id AS id, u.name, u.email, r.role_name AS role,
                COALESCE(u.profile_data, '{}'::jsonb) AS profile_data
         FROM users u
         JOIN user_roles r ON u.role_id = r.role_id
         WHERE u.email = $1`,
				[email]
			);

			if (result.rows.length === 0)
				return res.status(404).json({ message: "User not found" });

			user = result.rows[0];
		}

		// Fetch linked cars
		const carResult = await req.db.pgPool.query(
			`SELECT sc.car_id, sc.model, sc.status
       FROM smart_cars sc
       JOIN users u ON sc.user_id = u.user_id
       WHERE u.email = $1`,
			[email]
		);

		cars = carResult.rows;

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


module.exports = router;
