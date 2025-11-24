const { pgPool } = require("../config/database");

// for later, might be good to have those extra, for now just let carRoutes.js have the simple working apis

/** Get all cars with user role-based access */
async function getAllCars(userId) {
	// First get user role from database
	const userResult = await pgPool.query(
		`SELECT u.user_id, ur.role_name 
         FROM users u 
         JOIN user_roles ur ON u.role_id = ur.role_id 
         WHERE u.user_id = $1`,
		[userId]
	);

	if (userResult.rows.length === 0) {
		throw new Error("User not found");
	}

	const userRole = userResult.rows[0].role_name;

	let query = "";
	let params = [];

	if (userRole === "Admin") {
		query = `SELECT sc.*, u.name as owner_name, u.email as owner_email 
                 FROM smart_cars sc 
                 JOIN users u ON sc.user_id = u.user_id 
                 ORDER BY sc.car_id`;
	} else if (userRole === "CarOwner") {
		query = `SELECT sc.*, u.name as owner_name, u.email as owner_email 
                 FROM smart_cars sc 
                 JOIN users u ON sc.user_id = u.user_id 
                 WHERE sc.user_id = $1 
                 ORDER BY sc.car_id`;
		params = [userId];
	} else {
		throw new Error("Not authorized to view cars");
	}

	const result = await pgPool.query(query, params);
	return result.rows;
}

/** Get cars by user ID with permission check */
async function getCarsByUserId(targetUserId, currentUserId) {
	// First get current user's role
	const userResult = await pgPool.query(
		`SELECT u.user_id, ur.role_name 
         FROM users u 
         JOIN user_roles ur ON u.role_id = ur.role_id 
         WHERE u.user_id = $1`,
		[currentUserId]
	);

	if (userResult.rows.length === 0) {
		throw new Error("Current user not found");
	}

	const currentUserRole = userResult.rows[0].role_name;

	let query = "";
	let params = [];

	if (currentUserRole === "Admin") {
		query = `SELECT sc.*, u.name as owner_name, u.email as owner_email 
                 FROM smart_cars sc 
                 JOIN users u ON sc.user_id = u.user_id 
                 WHERE sc.user_id = $1 
                 ORDER BY sc.car_id`;
		params = [targetUserId];
	} else if (currentUserRole === "CarOwner") {
		if (targetUserId !== currentUserId) {
			return []; // No permission to view other users' cars
		}
		query = `SELECT sc.*, u.name as owner_name, u.email as owner_email 
                 FROM smart_cars sc 
                 JOIN users u ON sc.user_id = u.user_id 
                 WHERE sc.user_id = $1 
                 ORDER BY sc.car_id`;
		params = [targetUserId];
	} else {
		// Unknown role - no access
		return [];
	}

	try {
		const result = await pgPool.query(query, params);
		return result.rows;
	} catch (error) {
		console.error("Database error in getCarsByUserId:", error);
		throw new Error("Failed to fetch cars from database");
	}
}

/** Get car by ID with permission check */
async function getSmartCarById(carId, userRole, userId) {
	let query = "";
	let params = [carId];

	if (userRole === "Admin") {
		query = `
            SELECT sc.*, u.name as owner_name, u.email as owner_email 
            FROM smart_cars sc 
            JOIN users u ON sc.user_id = u.user_id 
            WHERE sc.car_id = $1
        `;
	} else {
		query = `
            SELECT sc.*, u.name as owner_name, u.email as owner_email 
            FROM smart_cars sc 
            JOIN users u ON sc.user_id = u.user_id 
            WHERE sc.car_id = $1 AND sc.user_id = $2
        `;
		params.push(userId);
	}

	const result = await pgPool.query(query, params);
	return result.rows[0] || null;
}

/** Register a new car with permission check */
async function registerSmartCar(data, userId) {
	// First, get the user's role from the database by joining with user_roles
	const userResult = await pgPool.query(
		`SELECT u.user_id, ur.role_name 
         FROM users u 
         JOIN user_roles ur ON u.role_id = ur.role_id 
         WHERE u.user_id = $1`,
		[userId]
	);

	if (userResult.rows.length === 0) {
		throw new Error(`User with ID ${userId} not found`);
	}

	const userRole = userResult.rows[0].role_name;
	let postgresUserId;

	// Determine which user ID to use based on actual role from database
	if (userRole === "Admin") {
		// Admin can register cars for any user
		postgresUserId = data.user_id;
		if (!postgresUserId) {
			throw new Error("user_id required when registering as Admin");
		}
	} else if (userRole === "CarOwner") {
		// CarOwner can only register cars for themselves
		postgresUserId = userId;

		// Prevent CarOwner from specifying a different user_id
		if (data.user_id && data.user_id !== userId) {
			throw new Error("Not authorized to register cars for other users");
		}
	} else {
		throw new Error("Not authorized to register cars");
	}

	// Verify the target user exists (if different from current user)
	if (postgresUserId !== userId) {
		const targetUserResult = await pgPool.query(
			"SELECT user_id FROM users WHERE user_id = $1",
			[postgresUserId]
		);

		if (targetUserResult.rows.length === 0) {
			throw new Error(`Target user with ID ${postgresUserId} not found`);
		}
	}

	// Insert the car
	const result = await pgPool.query(
		`INSERT INTO smart_cars (user_id, make, model, year, color, license_plate, vin, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
		[
			postgresUserId,
			data.make,
			data.model,
			data.year,
			data.color,
			data.license_plate,
			data.vin,
			data.status || "active",
		]
	);

	console.log(
		`[DB] Registered new car for user ${postgresUserId} with role ${userRole}, car ID: ${result.rows[0].car_id}`
	);
	return result.rows[0];
}

/** Update car telemetry with permission check */
async function updateCarTelemetry(carId, lat, lon, status, userRole, userId) {
	let query = "";
	let params = [lat, lon, status, carId];

	if (userRole !== "Admin") {
		// Non-admins can only update their own cars
		query = `
            UPDATE smart_cars
            SET current_latitude = $1,
                current_longitude = $2,
                status = $3,
                last_updated = CURRENT_TIMESTAMP
            WHERE car_id = $4 AND user_id = $5
            RETURNING *;
        `;
		params.push(userId);
	} else {
		// Admin can update any car
		query = `
            UPDATE smart_cars
            SET current_latitude = $1,
                current_longitude = $2,
                status = $3,
                last_updated = CURRENT_TIMESTAMP
            WHERE car_id = $4
            RETURNING *;
        `;
	}

	const result = await pgPool.query(query, params);
	return result.rows[0] || null;
}

/** Update car status with permission check */
async function updateCarStatus(carId, status, userRole, userId) {
	let query = "";
	let params = [status, carId];

	if (userRole !== "Admin") {
		query = `
            UPDATE smart_cars 
            SET status = $1, last_updated = CURRENT_TIMESTAMP 
            WHERE car_id = $2 AND user_id = $3 
            RETURNING *
        `;
		params.push(userId);
	} else {
		query = `
            UPDATE smart_cars 
            SET status = $1, last_updated = CURRENT_TIMESTAMP 
            WHERE car_id = $2 
            RETURNING *
        `;
	}

	const result = await pgPool.query(query, params);
	return result.rows[0] || null;
}

/** Update general car details with permission check */
async function updateCarDetails(carId, data, currentUserId) {
	// Determine current user's role
	const userResult = await pgPool.query(
		`SELECT u.user_id, ur.role_name
         FROM users u
         JOIN user_roles ur ON u.role_id = ur.role_id
         WHERE u.user_id = $1`,
		[currentUserId]
	);

	if (userResult.rows.length === 0) {
		throw new Error("User not found");
	}

	const userRole = userResult.rows[0].role_name;

	const allowedFields = {
		make: "make",
		model: "model",
		year: "year",
		color: "color",
		status: "status",
		license_plate: "license_plate",
		vin: "vin",
		current_latitude: "current_latitude",
		current_longitude: "current_longitude",
	};

	const setClauses = [];
	const params = [];
	let paramIndex = 1;

	Object.entries(allowedFields).forEach(([field, column]) => {
		if (data[field] !== undefined && data[field] !== null) {
			setClauses.push(`${column} = $${paramIndex++}`);
			params.push(data[field]);
		}
	});

	if (setClauses.length === 0) {
		throw new Error("No valid fields provided for update");
	}

	// Always update last_updated timestamp
	setClauses.push("last_updated = CURRENT_TIMESTAMP");

	let query = `
        UPDATE smart_cars
        SET ${setClauses.join(", ")}
        WHERE car_id = $${paramIndex}
    `;
	params.push(carId);

	if (userRole !== "Admin") {
		query += ` AND user_id = $${paramIndex + 1}`;
		params.push(currentUserId);
	}

	query += " RETURNING *;";

	const result = await pgPool.query(query, params);

	if (result.rows.length === 0) {
		throw new Error(
			"Car not found or you do not have permission to update it"
		);
	}

	return result.rows[0];
}

module.exports = {
	registerSmartCar,
	getSmartCarById,
	updateCarTelemetry,
	updateCarStatus,
	getCarsByUserId,
	getAllCars,
	updateCarDetails,
};
