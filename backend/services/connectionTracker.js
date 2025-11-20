const { pgPool } = require("../config/database");

/**
 * Record a new device connection
 * @param {number} deviceId - Device identifier
 * @param {string} connectionType - Type of connection (mqtt/websocket)
 * @returns {Object} - Connection record
 */
async function recordConnection(deviceId, connectionType = "mqtt") {
	try {
		const result = await pgPool.query(
			`INSERT INTO device_connections
			(device_id, connection_type, connected_at, status)
			VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')
			RETURNING *`,
			[deviceId, connectionType]
		);

		// Update device status to online
		await pgPool.query(
			`UPDATE iot_devices
			SET status = 'online', last_heartbeat = CURRENT_TIMESTAMP
			WHERE device_id = $1`,
			[deviceId]
		);

		console.log(`[Connection Tracker] Device ${deviceId} connected via ${connectionType}`);

		return result.rows[0];
	} catch (error) {
		console.error("Error recording connection:", error.message);
		throw error;
	}
}

/**
 * Record device disconnection
 * @param {number} deviceId - Device identifier
 * @returns {Object} - Updated connection record
 */
async function recordDisconnection(deviceId) {
	try {
		// Update the most recent active connection
		const result = await pgPool.query(
			`UPDATE device_connections
			SET status = 'disconnected', disconnected_at = CURRENT_TIMESTAMP
			WHERE device_id = $1 AND status = 'active'
			RETURNING *`,
			[deviceId]
		);

		// Update device status to offline
		await pgPool.query(
			`UPDATE iot_devices
			SET status = 'offline'
			WHERE device_id = $1`,
			[deviceId]
		);

		console.log(`[Connection Tracker] Device ${deviceId} disconnected`);

		return result.rows[0] || null;
	} catch (error) {
		console.error("Error recording disconnection:", error.message);
		throw error;
	}
}

/**
 * Update device heartbeat timestamp
 * @param {number} deviceId - Device identifier
 * @returns {Object} - Updated device record
 */
async function updateHeartbeat(deviceId) {
	try {
		const result = await pgPool.query(
			`UPDATE iot_devices
			SET last_heartbeat = CURRENT_TIMESTAMP,
			    status = CASE WHEN status = 'offline' THEN 'online' ELSE status END
			WHERE device_id = $1
			RETURNING *`,
			[deviceId]
		);

		if (result.rows.length === 0) {
			throw new Error(`Device ${deviceId} not found`);
		}

		console.log(`[Connection Tracker] Heartbeat updated for device ${deviceId}`);

		return result.rows[0];
	} catch (error) {
		console.error("Error updating heartbeat:", error.message);
		throw error;
	}
}

module.exports = {
	recordConnection,
	recordDisconnection,
	updateHeartbeat,
};
