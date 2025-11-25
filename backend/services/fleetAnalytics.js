const { pgPool } = require("../config/database");

/**
 * Get fleet health summary
 * @param {number} userId - User ID (optional, for CarOwner filtering)
 * @param {string} userRole - User role
 * @returns {Object} - Fleet health statistics
 */
async function getFleetHealth(userId, userRole) {
	try {
		let query = `
			SELECT
				COUNT(*) as total_devices,
				COUNT(CASE WHEN d.status = 'online' AND d.last_heartbeat IS NOT NULL AND d.last_heartbeat >= NOW() - INTERVAL '1 minute' THEN 1 END) as online_count,
				COUNT(CASE WHEN d.status = 'offline' OR (d.status = 'online' AND (d.last_heartbeat IS NULL OR d.last_heartbeat < NOW() - INTERVAL '5 minutes')) THEN 1 END) as offline_count,
				COUNT(CASE WHEN d.status = 'online' AND d.last_heartbeat IS NOT NULL AND d.last_heartbeat < NOW() - INTERVAL '1 minute' AND d.last_heartbeat >= NOW() - INTERVAL '5 minutes' THEN 1 END) as idle_count
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
		`;

		const queryParams = [];

		if (userRole === "CarOwner") {
			query += ` WHERE c.user_id = $1`;
			queryParams.push(userId);
		}

		const result = await pgPool.query(query, queryParams);

		console.log(`[Fleet Analytics] Retrieved fleet health for ${userRole}`);

		return result.rows[0];
	} catch (error) {
		console.error("Error getting fleet health:", error.message);
		throw error;
	}
}

/**
 * Get fleet analytics and insights
 * @param {number} userId - User ID (optional, for CarOwner filtering)
 * @param {string} userRole - User role
 * @returns {Object} - Fleet analytics
 */
async function getFleetAnalytics(userId, userRole) {
	try {
		// Get device type distribution
		let deviceTypeQuery = `
			SELECT
				d.device_type,
				COUNT(*) as count,
				COUNT(CASE WHEN d.status = 'online' THEN 1 END) as online_count
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
		`;

		const queryParams = [];

		if (userRole === "CarOwner") {
			deviceTypeQuery += ` WHERE c.user_id = $1`;
			queryParams.push(userId);
		}

		deviceTypeQuery += ` GROUP BY d.device_type`;

		const deviceTypeResult = await pgPool.query(
			deviceTypeQuery,
			queryParams
		);

		// Get firmware distribution
		let firmwareQuery = `
			SELECT
				f.version,
				f.device_type,
				COUNT(d.device_id) as device_count
			FROM device_firmware f
			LEFT JOIN iot_devices d ON f.firmware_id = d.current_firmware_id
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
		`;

		if (userRole === "CarOwner") {
			firmwareQuery += ` WHERE c.user_id = $1`;
		}

		firmwareQuery += ` GROUP BY f.firmware_id, f.version, f.device_type`;

		const firmwareResult = await pgPool.query(firmwareQuery, queryParams);

		console.log(
			`[Fleet Analytics] Retrieved fleet analytics for ${userRole}`
		);

		return {
			deviceTypeDistribution: deviceTypeResult.rows,
			firmwareDistribution: firmwareResult.rows,
		};
	} catch (error) {
		console.error("Error getting fleet analytics:", error.message);
		throw error;
	}
}

/**
 * Get fleet map data (devices with location)
 * @param {number} userId - User ID (optional, for CarOwner filtering)
 * @param {string} userRole - User role
 * @returns {Array} - Devices with location data
 */
async function getFleetMap(userId, userRole) {
	try {
		let query = `
			SELECT
				d.device_id,
				d.device_type,
				d.status,
				d.car_id,
				c.model as car_model,
				c.current_latitude as latitude,
				c.current_longitude as longitude
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE c.current_latitude IS NOT NULL
			AND c.current_longitude IS NOT NULL
		`;

		const queryParams = [];

		if (userRole === "CarOwner") {
			query += ` AND c.user_id = $1`;
			queryParams.push(userId);
		}

		const result = await pgPool.query(query, queryParams);

		console.log(
			`[Fleet Analytics] Retrieved ${result.rows.length} devices for map`
		);

		return result.rows;
	} catch (error) {
		console.error("Error getting fleet map:", error.message);
		throw error;
	}
}

/**
 * Get device diagnostics
 * @param {number} deviceId - Device identifier
 * @returns {Object} - Device diagnostics
 */
async function getDeviceDiagnostics(deviceId) {
	try {
		// Get device info
		const deviceResult = await pgPool.query(
			`SELECT d.*, f.version as firmware_version
			FROM iot_devices d
			LEFT JOIN device_firmware f ON d.current_firmware_id = f.firmware_id
			WHERE d.device_id = $1`,
			[deviceId]
		);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		const device = deviceResult.rows[0];

		// Get telemetry summary
		const telemetrySummaryResult = await pgPool.query(
			`SELECT * FROM device_telemetry_summary
			WHERE device_id = $1`,
			[deviceId]
		);

		// Get recent errors from telemetry
		const recentErrorsResult = await pgPool.query(
			`SELECT error_codes, timestamp
			FROM device_telemetry_summary
			WHERE device_id = $1
			AND error_codes IS NOT NULL
			ORDER BY timestamp DESC
			LIMIT 10`,
			[deviceId]
		);

		// Get recent commands
		const recentCommandsResult = await pgPool.query(
			`SELECT command_type, status, created_at, completed_at
			FROM device_commands
			WHERE device_id = $1
			ORDER BY created_at DESC
			LIMIT 5`,
			[deviceId]
		);

		// Get connection history
		const connectionHistoryResult = await pgPool.query(
			`SELECT connection_type, protocol, status, connected_at, disconnected_at
			FROM device_connections
			WHERE device_id = $1
			ORDER BY connected_at DESC
			LIMIT 5`,
			[deviceId]
		);

		console.log(
			`[Fleet Analytics] Retrieved diagnostics for device ${deviceId}`
		);

		return {
			device: device,
			telemetrySummary: telemetrySummaryResult.rows[0] || null,
			recentErrors: recentErrorsResult.rows,
			recentCommands: recentCommandsResult.rows,
			connectionHistory: connectionHistoryResult.rows,
		};
	} catch (error) {
		console.error("Error getting device diagnostics:", error.message);
		throw error;
	}
}

module.exports = {
	getFleetHealth,
	getFleetAnalytics,
	getFleetMap,
	getDeviceDiagnostics,
};
