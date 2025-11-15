const { pgPool } = require("../config/database");

// for later, might be good to have those extra, for now just let carRoutes.js have the simple working apis

/** Get all cars with user role-based access */
async function getAllCars(userRole, userId = null) {
	let query = "";
	let params = [];

	if (userRole === "Admin") {
		// Admin can see all cars
		query = `
            SELECT sc.*, u.name as owner_name, u.email as owner_email 
            FROM smart_cars sc 
            JOIN users u ON sc.user_id = u.user_id 
            ORDER BY sc.car_id
        `;
	} else if (userRole === "CarOwner") {
		// CarOwner can only see their own cars
		query = `
            SELECT sc.*, u.name as owner_name, u.email as owner_email 
            FROM smart_cars sc 
            JOIN users u ON sc.user_id = u.user_id 
            WHERE sc.user_id = $1 
            ORDER BY sc.car_id
        `;
		params = [userId];
	} else {
		// ServiceStaff or other roles - adjust as needed
		query = "SELECT * FROM smart_cars ORDER BY car_id";
	}

	const result = await pgPool.query(query, params);
	return result.rows;
}

/** Get cars by user ID with permission check */
async function getCarsByUserId(targetUserId, currentUserRole, currentUserId) {
	// Build query based on permissions
	let query = "";
	let params = [];

	if (currentUserRole === "Admin") {
		query = `
			SELECT sc.*, u.name as owner_name, u.email as owner_email 
			FROM smart_cars sc 
			JOIN users u ON sc.user_id = u.user_id 
			WHERE sc.user_id = $1 
			ORDER BY sc.car_id
		`;
		params = [targetUserId];
	} else if (currentUserRole === "CarOwner") {
		if (targetUserId !== currentUserId) {
			return []; // No permission to view other users' cars
		}
		query = `
			SELECT sc.*, u.name as owner_name, u.email as owner_email 
			FROM smart_cars sc 
			JOIN users u ON sc.user_id = u.user_id 
			WHERE sc.user_id = $1 
			ORDER BY sc.car_id
		`;
		params = [targetUserId];
	} else if (
		currentUserRole === "ServiceStaff" ||
		currentUserRole === "IoT"
	) {
		query = `
			SELECT sc.*, u.name as owner_name, u.email as owner_email 
			FROM smart_cars sc 
			JOIN users u ON sc.user_id = u.user_id 
			WHERE sc.user_id = $1 
			ORDER BY sc.car_id
		`;
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
async function registerSmartCar(data, userRole, userId) {
	// Determine which user ID to use
	let postgresUserId;

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

	// Verify the user exists
	const userResult = await pgPool.query(
		"SELECT user_id FROM users WHERE user_id = $1",
		[postgresUserId]
	);

	if (userResult.rows.length === 0) {
		throw new Error(`User with ID ${postgresUserId} not found`);
	}

	const result = await pgPool.query(
		`INSERT INTO smart_cars (user_id, model, status, last_updated)
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
		[
			postgresUserId,
			data.model || "Autonomous Vehicle",
			data.status || "active",
			new Date(),
		]
	);

	console.log(`[DB] Registered new car with ID: ${result.rows[0].car_id}`);
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

module.exports = {
	registerSmartCar,
	getSmartCarById,
	updateCarTelemetry,
	updateCarStatus,
	getCarsByUserId,
	getAllCars,
};
