const { pgPool } = require("../config/database");
const crypto = require("crypto");
const { updateHeartbeat } = require("../services/connectionTracker");
const {
	storeTelemetry,
	getTelemetry,
	updateTelemetrySummary,
} = require("../services/telemetryService");
const {
	createCommand,
	getCommandStatus,
} = require("../services/commandProcessor");
const {
	getFirmwareVersions,
	createFirmwareVersion,
	initiateFirmwareUpdate,
} = require("../services/firmwareService");
const {
	getFleetHealth,
	getFleetAnalytics,
	getFleetMap,
	getDeviceDiagnostics,
} = require("../services/fleetAnalytics");

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

		console.log(`[Device Manager] Registered device: ${deviceId} for car: ${carId}`);

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

		console.log(`[Device Manager] Retrieved ${result.rows.length} devices for ${userRole}`);

		return result.rows;
	} catch (error) {
		console.error("Error in getDevices:", error.message);
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

		console.log(`[Device Manager] Retrieved device ${deviceId} for ${userRole}`);

		return result.rows[0];
	} catch (error) {
		console.error("Error in getDeviceById:", error.message);
		throw error;
	}
}

/**
 * Get device connection status and recent activity
 * @param {Object} params - Query parameters
 * @returns {Object} - Device status information
 */
async function getDeviceStatus(params) {
	const { deviceId, userRole, userId } = params;

	try {
		// First check if device exists and user has access
		let deviceQuery = `
			SELECT d.*, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		const device = deviceResult.rows[0];

		// Get recent connection history
		const connectionsResult = await pgPool.query(
			`SELECT * FROM device_connections
			WHERE device_id = $1
			ORDER BY connected_at DESC
			LIMIT 10`,
			[deviceId]
		);

		console.log(`[Device Manager] Retrieved status for device ${deviceId}`);

		return {
			device_id: device.device_id,
			status: device.status,
			last_heartbeat: device.last_heartbeat,
			connection_history: connectionsResult.rows,
		};
	} catch (error) {
		console.error("Error in getDeviceStatus:", error.message);
		throw error;
	}
}

/**
 * Update device heartbeat timestamp
 * @param {Object} params - Parameters
 * @returns {Object} - Updated device
 */
async function updateDeviceHeartbeat(params) {
	const { deviceId, userRole, userId } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		// Update the heartbeat
		const updatedDevice = await updateHeartbeat(deviceId);

		return updatedDevice;
	} catch (error) {
		console.error("Error in updateDeviceHeartbeat:", error.message);
		throw error;
	}
}

/**
 * Submit telemetry data for a device
 * @param {Object} params - Parameters including deviceId and telemetry data
 * @returns {Object} - Stored telemetry record
 */
async function submitTelemetry(params) {
	const { deviceId, userRole, userId, telemetryData } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		// Store the telemetry data
		const telemetry = await storeTelemetry(deviceId, telemetryData);

		// Update telemetry summary asynchronously (don't wait for it)
		updateTelemetrySummary(deviceId).catch((err) => {
			console.error(`Error updating telemetry summary for device ${deviceId}:`, err.message);
		});

		return telemetry;
	} catch (error) {
		console.error("Error in submitTelemetry:", error.message);
		throw error;
	}
}

/**
 * Get telemetry data for a device
 * @param {Object} params - Parameters including deviceId and query options
 * @returns {Array} - Telemetry records
 */
async function getDeviceTelemetry(params) {
	const { deviceId, userRole, userId, options } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		// Get telemetry data
		const telemetry = await getTelemetry(deviceId, options);

		return telemetry;
	} catch (error) {
		console.error("Error in getDeviceTelemetry:", error.message);
		throw error;
	}
}

/**
 * Send a command to a device
 * @param {Object} params - Parameters including deviceId and command data
 * @returns {Object} - Created command record
 */
async function sendDeviceCommand(params) {
	const { deviceId, userRole, userId, commandData } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, d.status, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		const device = deviceResult.rows[0];

		// Check if device is online (optional warning, not blocking)
		if (device.status === "offline") {
			console.warn(
				`[Device Manager] Warning: Sending command to offline device ${deviceId}`
			);
		}

		// Create the command
		const command = await createCommand(deviceId, commandData);

		return command;
	} catch (error) {
		console.error("Error in sendDeviceCommand:", error.message);
		throw error;
	}
}

/**
 * Get command status by command ID
 * @param {Object} params - Parameters including commandId
 * @returns {Object|null} - Command record or null
 */
async function getDeviceCommandStatus(params) {
	const { deviceId, commandId, userRole, userId } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		// Get command status
		const command = await getCommandStatus(commandId);

		// Verify command belongs to the device
		if (command && command.device_id !== deviceId) {
			return null; // Command doesn't belong to this device
		}

		return command;
	} catch (error) {
		console.error("Error in getDeviceCommandStatus:", error.message);
		throw error;
	}
}

/**
 * Get all firmware versions
 * @param {Object} params - Parameters including filters
 * @returns {Array} - List of firmware versions
 */
async function getAllFirmwareVersions(params) {
	const { device_type } = params;

	try {
		const filters = {};

		if (device_type) {
			filters.device_type = device_type;
		}

		const firmwareVersions = await getFirmwareVersions(filters);

		return firmwareVersions;
	} catch (error) {
		console.error("Error in getAllFirmwareVersions:", error.message);
		throw error;
	}
}

/**
 * Create a new firmware version (Admin only)
 * @param {Object} params - Parameters including firmware data
 * @returns {Object} - Created firmware version
 */
async function addFirmwareVersion(params) {
	const { firmwareData } = params;

	try {
		const firmware = await createFirmwareVersion(firmwareData);

		return firmware;
	} catch (error) {
		console.error("Error in addFirmwareVersion:", error.message);
		throw error;
	}
}

/**
 * Update device firmware
 * @param {Object} params - Parameters including deviceId and target version
 * @returns {Object} - Update result
 */
async function updateDeviceFirmware(params) {
	const { deviceId, userRole, userId, targetVersion } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		// Initiate firmware update
		const updateResult = await initiateFirmwareUpdate(deviceId, targetVersion);

		return updateResult;
	} catch (error) {
		console.error("Error in updateDeviceFirmware:", error.message);
		throw error;
	}
}

/**
 * Get fleet health overview
 * @param {Object} params - Parameters including user info
 * @returns {Object} - Fleet health statistics
 */
async function getFleetHealthOverview(params) {
	const { userRole, userId } = params;

	try {
		const health = await getFleetHealth(userId, userRole);

		return health;
	} catch (error) {
		console.error("Error in getFleetHealthOverview:", error.message);
		throw error;
	}
}

/**
 * Get fleet analytics and insights
 * @param {Object} params - Parameters including user info
 * @returns {Object} - Fleet analytics
 */
async function getFleetAnalyticsData(params) {
	const { userRole, userId } = params;

	try {
		const analytics = await getFleetAnalytics(userId, userRole);

		return analytics;
	} catch (error) {
		console.error("Error in getFleetAnalyticsData:", error.message);
		throw error;
	}
}

/**
 * Get fleet map data
 * @param {Object} params - Parameters including user info
 * @returns {Array} - Fleet map data
 */
async function getFleetMapData(params) {
	const { userRole, userId } = params;

	try {
		const mapData = await getFleetMap(userId, userRole);

		return mapData;
	} catch (error) {
		console.error("Error in getFleetMapData:", error.message);
		throw error;
	}
}

/**
 * Get device diagnostics
 * @param {Object} params - Parameters including deviceId and user info
 * @returns {Object|null} - Device diagnostics or null
 */
async function getDeviceDiagnosticsData(params) {
	const { deviceId, userRole, userId } = params;

	try {
		// Verify device exists and user has access
		let deviceQuery = `
			SELECT d.device_id, c.user_id as car_owner_id
			FROM iot_devices d
			LEFT JOIN smart_cars c ON d.car_id = c.car_id
			WHERE d.device_id = $1
		`;

		const deviceParams = [deviceId];

		if (userRole === "CarOwner") {
			deviceQuery += ` AND c.user_id = $2`;
			deviceParams.push(userId);
		}

		const deviceResult = await pgPool.query(deviceQuery, deviceParams);

		if (deviceResult.rows.length === 0) {
			return null;
		}

		// Get diagnostics
		const diagnostics = await getDeviceDiagnostics(deviceId);

		return diagnostics;
	} catch (error) {
		console.error("Error in getDeviceDiagnosticsData:", error.message);
		throw error;
	}
}

module.exports = {
	registerDevice,
	getDevices,
	getDeviceById,
	getDeviceStatus,
	updateDeviceHeartbeat,
	submitTelemetry,
	getDeviceTelemetry,
	sendDeviceCommand,
	getDeviceCommandStatus,
	getAllFirmwareVersions,
	addFirmwareVersion,
	updateDeviceFirmware,
	getFleetHealthOverview,
	getFleetAnalyticsData,
	getFleetMapData,
	getDeviceDiagnosticsData,
};