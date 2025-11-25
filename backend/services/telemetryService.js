const { pgPool } = require("../config/database");

/**
 * Store device telemetry data
 * @param {number} deviceId - Device identifier
 * @param {Object} telemetryData - Telemetry data to store
 * @returns {Object} - Stored telemetry record
 */
async function storeTelemetry(deviceId, telemetryData) {
	try {
		const {
			latitude,
			longitude,
			speed,
			battery_level,
			temperature,
			signal_strength,
			error_codes,
			metadata,
		} = telemetryData;

		// Insert telemetry data into device_telemetry_summary table
		const result = await pgPool.query(
			`INSERT INTO device_telemetry_summary
			(device_id, timestamp, latitude, longitude, speed,
			 battery_level, temperature, signal_strength, error_codes, metadata)
			VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *`,
			[
				deviceId,
				latitude || null,
				longitude || null,
				speed || null,
				battery_level || null,
				temperature || null,
				signal_strength || null,
				error_codes || null,
				metadata ? JSON.stringify(metadata) : null,
			]
		);

		// Update device heartbeat
		await pgPool.query(
			`UPDATE iot_devices
			SET last_heartbeat = CURRENT_TIMESTAMP,
			    status = 'online'
			WHERE device_id = $1`,
			[deviceId]
		);

		console.log(
			`[Telemetry Service] Stored telemetry for device ${deviceId}`
		);

		return result.rows[0];
	} catch (error) {
		console.error("Error storing telemetry:", error.message);
		throw error;
	}
}

/**
 * Get telemetry data for a device
 * @param {number} deviceId - Device identifier
 * @param {Object} options - Query options (limit, offset, startDate, endDate)
 * @returns {Array} - Telemetry records
 */
async function getTelemetry(deviceId, options = {}) {
	try {
		const { limit = 100, offset = 0, startDate, endDate } = options;

		let query = `
			SELECT *
			FROM device_telemetry_summary
			WHERE device_id = $1
		`;

		const queryParams = [deviceId];
		let paramIndex = 2;

		// Add date filters if provided
		if (startDate) {
			query += ` AND timestamp >= $${paramIndex}`;
			queryParams.push(startDate);
			paramIndex++;
		}

		if (endDate) {
			query += ` AND timestamp <= $${paramIndex}`;
			queryParams.push(endDate);
			paramIndex++;
		}

		query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		queryParams.push(limit, offset);

		const result = await pgPool.query(query, queryParams);

		console.log(
			`[Telemetry Service] Retrieved ${result.rows.length} records for device ${deviceId}`
		);

		return result.rows;
	} catch (error) {
		console.error("Error retrieving telemetry:", error.message);
		throw error;
	}
}

/**
 * Update device telemetry summary
 * @param {number} deviceId - Device identifier
 * @returns {Object} - Summary statistics (computed on-the-fly)
 * @deprecated This function is kept for backward compatibility but no longer stores separate summaries
 * since device_telemetry_summary now stores raw telemetry data. Summaries are computed via queries.
 */
async function updateTelemetrySummary(deviceId) {
	try {
		// Compute summary statistics from raw telemetry data
		const telemetryResult = await pgPool.query(
			`SELECT
				AVG(battery_level) as avg_battery,
				AVG(temperature) as avg_temperature,
				AVG(signal_strength) as avg_signal,
				COUNT(*) as total_records
			FROM device_telemetry_summary
			WHERE device_id = $1
			AND timestamp >= NOW() - INTERVAL '24 hours'`,
			[deviceId]
		);

		const stats = telemetryResult.rows[0];

		console.log(
			`[Telemetry Service] Computed summary stats for device ${deviceId}`
		);

		// Return computed stats (not stored separately)
		return {
			device_id: deviceId,
			avg_battery_level: stats.avg_battery || 0,
			avg_temperature: stats.avg_temperature || 0,
			avg_signal_strength: stats.avg_signal || 0,
			total_data_points: stats.total_records || 0,
			computed_at: new Date(),
		};
	} catch (error) {
		console.error("Error computing telemetry summary:", error.message);
		throw error;
	}
}

module.exports = {
	storeTelemetry,
	getTelemetry,
	updateTelemetrySummary,
};
