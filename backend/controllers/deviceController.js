const { pgPool } = require("../config/database");
const crypto = require("crypto");

/**
 * Register a new IoT device
 * @param {Object} data - Device registration data
 * @returns {Object} - Registered device and MQTT credentials
 */
async function registerDevice(data) {
	const { deviceType, carId, firmwareVersion, certificate } = data;

	try {
		// Verify the car exists
		const carCheck = await pgPool.query(
			"SELECT car_id FROM smart_cars WHERE car_id = $1",
			[carId]
		);

		if (carCheck.rows.length === 0) {
			throw new Error(`Car with ID ${carId} not found`);
		}

		// Check if firmwareVersion is provided and find matching firmware
		let firmwareId = null;
		if (firmwareVersion) {
			const firmwareResult = await pgPool.query(
				"SELECT firmware_id FROM device_firmware WHERE version = $1 AND device_type = $2",
				[firmwareVersion, deviceType]
			);

			if (firmwareResult.rows.length > 0) {
				firmwareId = firmwareResult.rows[0].firmware_id;
			}
		}

		// Extract certificate information if provided
		let certificateIssuer = null;
		let certificateExpiry = null;

		if (certificate) {
			certificateIssuer = certificate.issuer || "Self-Signed";
			certificateExpiry = certificate.expiry || null;
		}

		// Insert device into database (device_id is auto-generated)
		const result = await pgPool.query(
			`INSERT INTO iot_devices
			(car_id, device_type, status, last_heartbeat,
			 current_firmware_id, certificate_issuer, certificate_expiry)
			VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
			RETURNING *`,
			[
				carId,
				deviceType,
				"offline", // Initial status
				firmwareId,
				certificateIssuer,
				certificateExpiry,
			]
		);

		const registeredDevice = result.rows[0];
		const deviceId = registeredDevice.device_id;

		// Generate MQTT credentials using the auto-generated device_id
		const mqttCredentials = generateMQTTCredentials(deviceId);

		console.log(
			`[Device Manager] Registered device: ${deviceId} for car: ${carId}`
		);

		return {
			device: registeredDevice,
			mqttCredentials: mqttCredentials,
		};
	} catch (error) {
		console.error("Error in registerDevice:", error.message);
		throw error;
	}
}

/**
 * Generate MQTT credentials for a device
 * @param {string} deviceId - The device identifier
 * @returns {Object} - MQTT connection credentials
 */
function generateMQTTCredentials(deviceId) {
	// Generate a secure password for MQTT
	const mqttPassword = crypto.randomBytes(16).toString("hex");

	// Get MQTT broker configuration from environment
	const mqttBrokerHost = process.env.MQTT_BROKER_HOST || "localhost";
	const mqttBrokerPort = process.env.MQTT_BROKER_PORT || 1883;
	const mqttUsername = `device_${deviceId}`;

	return {
		clientId: deviceId,
		username: mqttUsername,
		password: mqttPassword,
		broker: `mqtt://${mqttBrokerHost}:${mqttBrokerPort}`,
	};
}

/**
 * Get devices with role-based filtering
 * @param {Object} params - Query parameters
 * @returns {Array} - List of devices
 */
async function getDevices(params) {
	const { userRole, userId, carId, deviceType, status } = params;

	try {
		let query = `
			SELECT
				d.device_id,
				d.car_id,
				d.device_type,
				d.status,
				d.last_heartbeat,
				d.current_firmware_id,
				d.certificate_issuer,
				d.certificate_expiry,
				d.last_firmware_update,
				c.model as car_model,
				c.user_id as car_owner_id,
				f.version as firmware_version
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			LEFT JOIN device_firmware f ON d.current_firmware_id = f.firmware_id
			WHERE 1=1
		`;

		const queryParams = [];
		let paramIndex = 1;

		// Role-based filtering
		if (userRole === "CarOwner") {
			// CarOwner can only see devices for their cars
			query += ` AND c.user_id = $${paramIndex}`;
			queryParams.push(userId);
			paramIndex++;
		}
		// Admin can see all devices (no additional filter)

		// Optional filters
		if (carId) {
			query += ` AND d.car_id = $${paramIndex}`;
			queryParams.push(parseInt(carId));
			paramIndex++;
		}

		if (deviceType) {
			query += ` AND d.device_type = $${paramIndex}`;
			queryParams.push(deviceType);
			paramIndex++;
		}

		if (status) {
			query += ` AND d.status = $${paramIndex}`;
			queryParams.push(status);
			paramIndex++;
		}

		query += ` ORDER BY d.device_id DESC`;

		const result = await pgPool.query(query, queryParams);

		console.log(
			`[Device Manager] Retrieved ${result.rows.length} devices for ${userRole}`
		);

		return result.rows;
	} catch (error) {
		console.error("Error in getDevices:", error.message);
		throw error;
	}
}

/**
 * Get active devices for admins
 * @returns {Array} - List of devices
 */
async function getActiveDevices() {
	try {
		let params = ["active"];
		let query = `
			SELECT
				d.device_id,
				d.car_id,
				d.device_type,
				d.status,
				d.last_heartbeat,
				d.current_firmware_id,
				d.certificate_issuer,
				d.certificate_expiry,
				d.last_firmware_update,
				c.model as car_model,
				c.user_id as car_owner_id,
				f.version as firmware_version
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			LEFT JOIN device_firmware f ON d.current_firmware_id = f.firmware_id
			WHERE 1=1 AND d.status = $1
			ORDER BY d.device_id DESC
		`;

		const result = await pgPool.query(query, params);
		console.log(
			`[Device Manager] Retrieved ${result.rows.length} active devices`
		);

		return result.rows;
	} catch (error) {
		console.error("Error in getActiveDevices:", error.message);
		throw error;
	}
}

/**
 * Get a specific device by ID with role-based access control
 * @param {Object} params - Query parameters
 * @returns {Object|null} - Device object or null
 */
async function getDeviceById(params) {
	const { deviceId, userRole, userId } = params;

	try {
		let query = `
			SELECT
				d.device_id,
				d.car_id,
				d.device_type,
				d.status,
				d.last_heartbeat,
				d.current_firmware_id,
				d.certificate_issuer,
				d.certificate_expiry,
				d.last_firmware_update,
				c.model as car_model,
				c.user_id as car_owner_id,
				c.status as car_status,
				c.current_latitude,
				c.current_longitude,
				f.version as firmware_version,
				f.release_date as firmware_release_date
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			LEFT JOIN device_firmware f ON d.current_firmware_id = f.firmware_id
			WHERE d.device_id = $1
		`;

		const queryParams = [deviceId];

		// Role-based access control
		if (userRole === "CarOwner") {
			// CarOwner can only see devices for their cars
			query += ` AND c.user_id = $2`;
			queryParams.push(userId);
		}
		// Admin can see any device (no additional filter)

		const result = await pgPool.query(query, queryParams);

		if (result.rows.length === 0) {
			return null;
		}

		console.log(
			`[Device Manager] Retrieved device ${deviceId} for ${userRole}`
		);

		return result.rows[0];
	} catch (error) {
		console.error("Error in getDeviceById:", error.message);
		throw error;
	}
}

/**
 * Updates device by ID with role-based access control
 * @param {Object} params - Query parameters
 * @returns {Object|null} - Device object or null
 */
async function updateDevice(params) {
	const { deviceId, userRole, userId, deviceStatus, deviceTimestamp } =
		params;

	try {
		const query = `
			UPDATE iot_devices AS d
			SET status = $1,
				last_heartbeat = COALESCE($2, NOW())
			WHERE d.device_id = $3
		`;
		const params = [deviceStatus, deviceTimestamp ?? null, deviceId];

		let sql = query;
		const args = [...params];
		if (userRole === "CarOwner") {
			sql += `
			AND EXISTS (
				SELECT 1
				FROM smart_cars c
				WHERE c.car_id = d.car_id
				AND c.user_id = $4
			)
			`;
			args.push(userId);
		}
		sql += ` RETURNING *;`;

		const result = await pgPool.query(sql, args);
		if (result.rows.length === 0) {
			return null;
		}

		console.log(
			`[Device Manager] Updated device ${deviceId} for ${userRole}`
		);
		return result.rows[0];
	} catch (error) {
		console.error("Error in updateDevice:", error.message);
		throw error;
	}
}

module.exports = {
	registerDevice,
	getDevices,
	getActiveDevices,
	getDeviceById,
	updateDevice,
};
