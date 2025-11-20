const { pgPool } = require("../config/database");

/**
 * Get all firmware versions
 * @param {Object} filters - Optional filters (device_type)
 * @returns {Array} - List of firmware versions
 */
async function getFirmwareVersions(filters = {}) {
	try {
		let query = `
			SELECT *
			FROM device_firmware
			WHERE 1=1
		`;

		const queryParams = [];
		let paramIndex = 1;

		if (filters.device_type) {
			query += ` AND device_type = $${paramIndex}`;
			queryParams.push(filters.device_type);
			paramIndex++;
		}

		query += ` ORDER BY release_date DESC`;

		const result = await pgPool.query(query, queryParams);

		console.log(
			`[Firmware Service] Retrieved ${result.rows.length} firmware versions`
		);

		return result.rows;
	} catch (error) {
		console.error("Error getting firmware versions:", error.message);
		throw error;
	}
}

/**
 * Create a new firmware version
 * @param {Object} firmwareData - Firmware data
 * @returns {Object} - Created firmware record
 */
async function createFirmwareVersion(firmwareData) {
	try {
		const {
			version,
			device_type,
			release_notes,
			download_url,
			file_size,
			checksum,
		} = firmwareData;

		// Validate required fields
		if (!version || !device_type) {
			throw new Error("Missing required fields: version, device_type");
		}

		// Check if version already exists for this device type
		const existingCheck = await pgPool.query(
			`SELECT firmware_id FROM device_firmware
			WHERE version = $1 AND device_type = $2`,
			[version, device_type]
		);

		if (existingCheck.rows.length > 0) {
			throw new Error(
				`Firmware version ${version} already exists for device type ${device_type}`
			);
		}

		// Insert new firmware version
		const result = await pgPool.query(
			`INSERT INTO device_firmware
			(version, device_type, release_date, release_notes,
			 download_url, file_size, checksum)
			VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)
			RETURNING *`,
			[
				version,
				device_type,
				release_notes || null,
				download_url || null,
				file_size || null,
				checksum || null,
			]
		);

		console.log(
			`[Firmware Service] Created firmware version ${version} for ${device_type}`
		);

		return result.rows[0];
	} catch (error) {
		console.error("Error creating firmware version:", error.message);
		throw error;
	}
}

/**
 * Initiate firmware update for a device
 * @param {number} deviceId - Device identifier
 * @param {string} targetVersion - Target firmware version
 * @returns {Object} - Update result
 */
async function initiateFirmwareUpdate(deviceId, targetVersion) {
	try {
		// Get current device info
		const deviceResult = await pgPool.query(
			`SELECT d.*, f.version as current_version
			FROM iot_devices d
			LEFT JOIN device_firmware f ON d.current_firmware_id = f.firmware_id
			WHERE d.device_id = $1`,
			[deviceId]
		);

		if (deviceResult.rows.length === 0) {
			throw new Error(`Device ${deviceId} not found`);
		}

		const device = deviceResult.rows[0];

		// Get target firmware
		const firmwareResult = await pgPool.query(
			`SELECT * FROM device_firmware
			WHERE version = $1 AND device_type = $2`,
			[targetVersion, device.device_type]
		);

		if (firmwareResult.rows.length === 0) {
			throw new Error(
				`Firmware version ${targetVersion} not found for device type ${device.device_type}`
			);
		}

		const targetFirmware = firmwareResult.rows[0];

		// Check if already on target version
		if (device.current_version === targetVersion) {
			throw new Error(`Device already on firmware version ${targetVersion}`);
		}

		// Update device firmware reference
		const updateResult = await pgPool.query(
			`UPDATE iot_devices
			SET current_firmware_id = $1,
			    last_firmware_update = CURRENT_TIMESTAMP
			WHERE device_id = $2
			RETURNING *`,
			[targetFirmware.firmware_id, deviceId]
		);

		console.log(
			`[Firmware Service] Initiated firmware update for device ${deviceId} to version ${targetVersion}`
		);

		return {
			device_id: deviceId,
			previous_version: device.current_version,
			target_version: targetVersion,
			status: "update_initiated",
			firmware: targetFirmware,
		};
	} catch (error) {
		console.error("Error initiating firmware update:", error.message);
		throw error;
	}
}

module.exports = {
	getFirmwareVersions,
	createFirmwareVersion,
	initiateFirmwareUpdate,
};
