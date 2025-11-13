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
}) {
	try {
		// Check if user already exists in PostgreSQL
		const existingUser = await pgPool.query(
			"SELECT user_id FROM users WHERE email = $1",
			[email]
		);

		if (existingUser.rows.length > 0) {
			throw new Error("User with this email already exists.");
		}

		// Get role_id
		const roleResult = await pgPool.query(
			"SELECT role_id FROM user_roles WHERE role_name = $1",
			[role]
		);

		if (roleResult.rows.length === 0) {
			throw new Error(`Role ${role} not found`);
		}

		const roleId = roleResult.rows[0].role_id;

		// Hash password
		const saltRounds = 10;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		// Insert user into PostgreSQL
		const userResult = await pgPool.query(
			`INSERT INTO users (role_id, user_type, name, email, password_hash, phone, company_name, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING user_id, name, email, role_id, created_at`,
			[
				roleId,
				user_type,
				name,
				email,
				passwordHash,
				phone || null,
				company_name || null,
				new Date(),
			]
		);

		// Get role name for response
		const userWithRole = {
			...userResult.rows[0],
			role: role, // Include role in response
		};

		return userWithRole;
	} catch (error) {
		console.error("Error in registerUser:", error.message);
		throw error;
	}
}

/** Authenticates user against PostgreSQL */
async function authenticateUser(email, password) {
	try {
		const userResult = await pgPool.query(
			`SELECT u.user_id, u.name, u.email, u.password_hash, u.role_id, r.role_name
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
