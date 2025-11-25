const { pgPool } = require("../config/database");
const bcrypt = require("bcryptjs");

/** Registers a new user in PostgreSQL */
async function registerUser({
	email,
	password,
	name,
	role = "CarOwner",
	user_type = "Individual",
	phone,
	company_name,
	profile_data = {}, // optional incoming profile fields
}) {
	try {
		// Check if user exists
		const existingUser = await pgPool.query(
			"SELECT u.user_id, r.role_name AS role FROM users u JOIN user_roles r ON u.role_id = r.role_id WHERE u.email = $1",
			[email]
		);
		if (existingUser.rows.length > 0) return existingUser.rows[0];

		// Get role_id
		const roleResult = await pgPool.query(
			"SELECT role_id FROM user_roles WHERE role_name = $1",
			[role]
		);
		if (roleResult.rows.length === 0)
			throw new Error(`Role ${role} not found`);
		const roleId = roleResult.rows[0].role_id;

		// Hash password
		let passwordHash = null;
		if (password) {
			const saltRounds = 10;
			passwordHash = await bcrypt.hash(password, saltRounds);
		}

		// Merge defaults into profile_data
		const defaultProfile = {
			picture: "",
			location: "",
			emailNotifications: true,
			pushNotifications: true,
		};
		const finalProfileData = { ...defaultProfile, ...profile_data };

		const userResult = await pgPool.query(
			`INSERT INTO users (role_id, user_type, name, email, password_hash, phone, company_name, profile_data, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
       RETURNING user_id, name, email, role_id, profile_data, created_at`,
			[
				roleId,
				user_type,
				name,
				email,
				passwordHash,
				phone || null,
				company_name || null,
				JSON.stringify(finalProfileData),
				new Date(),
			]
		);

		return { ...userResult.rows[0], role };
	} catch (error) {
		console.error("Error in registerUser:", error.message);
		throw error;
	}
}

/** Authenticates user against PostgreSQL */
async function authenticateUser(email, password) {
	try {
		const userResult = await pgPool.query(
			`SELECT u.user_id, u.name, u.email, u.password_hash, u.role_id, r.role_name, 
          	u.profile_data
   			FROM users u
   			JOIN user_roles r ON u.role_id = r.role_id
   			WHERE u.email = $1`,
			[email]
		);

		if (userResult.rows.length === 0) {
			return null;
		}

		const user = userResult.rows[0];

		// Verify password
		const isPasswordValid = await bcrypt.compare(
			password,
			user.password_hash
		);

		if (!isPasswordValid) {
			return null;
		}

		// Update last login
		await pgPool.query(
			"UPDATE users SET last_login = $1 WHERE user_id = $2",
			[new Date(), user.user_id]
		);

		// Remove password hash from returned user object
		const { password_hash, ...userWithoutPassword } = user;

		return userWithoutPassword;
	} catch (error) {
		console.error("Error in authenticateUser:", error.message);
		console.error("Full error:", error);
		throw error;
	}
}

module.exports = {
	registerUser,
	authenticateUser,
};
