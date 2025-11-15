const { pgPool } = require("../config/database");

/**
 * Create a new device command
 * @param {number} deviceId - Device identifier
 * @param {Object} commandData - Command data
 * @returns {Object} - Created command record
 */
async function createCommand(deviceId, commandData) {
	try {
		const { command_type, parameters, priority = "normal", timeout = 30 } = commandData;

		// Validate command type
		const validCommandTypes = [
			"restart",
			"update_firmware",
			"change_config",
			"lock",
			"unlock",
			"diagnostic",
			"custom",
		];

		if (!validCommandTypes.includes(command_type)) {
			throw new Error(`Invalid command type: ${command_type}`);
		}

		// Insert command into queue
		const result = await pgPool.query(
			`INSERT INTO device_commands
			(device_id, command_type, parameters, status, priority,
			 created_at, timeout_seconds)
			VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP, $5)
			RETURNING *`,
			[
				deviceId,
				command_type,
				parameters ? JSON.stringify(parameters) : null,
				priority,
				timeout,
			]
		);

		console.log(
			`[Command Processor] Created command ${result.rows[0].command_id} for device ${deviceId}`
		);

		return result.rows[0];
	} catch (error) {
		console.error("Error creating command:", error.message);
		throw error;
	}
}

/**
 * Get command status
 * @param {number} commandId - Command identifier
 * @returns {Object|null} - Command record or null
 */
async function getCommandStatus(commandId) {
	try {
		const result = await pgPool.query(
			`SELECT * FROM device_commands WHERE command_id = $1`,
			[commandId]
		);

		if (result.rows.length === 0) {
			return null;
		}

		console.log(`[Command Processor] Retrieved status for command ${commandId}`);

		return result.rows[0];
	} catch (error) {
		console.error("Error getting command status:", error.message);
		throw error;
	}
}

/**
 * Update command status
 * @param {number} commandId - Command identifier
 * @param {string} status - New status (pending, sent, executing, completed, failed, timeout)
 * @param {string} result - Command result or error message
 * @returns {Object} - Updated command record
 */
async function updateCommandStatus(commandId, status, result = null) {
	try {
		const validStatuses = [
			"pending",
			"sent",
			"executing",
			"completed",
			"failed",
			"timeout",
		];

		if (!validStatuses.includes(status)) {
			throw new Error(`Invalid status: ${status}`);
		}

		let query;
		let params;

		if (status === "sent") {
			query = `UPDATE device_commands
				SET status = $1, sent_at = CURRENT_TIMESTAMP
				WHERE command_id = $2
				RETURNING *`;
			params = [status, commandId];
		} else if (status === "completed" || status === "failed" || status === "timeout") {
			query = `UPDATE device_commands
				SET status = $1, completed_at = CURRENT_TIMESTAMP, result = $2
				WHERE command_id = $3
				RETURNING *`;
			params = [status, result, commandId];
		} else {
			query = `UPDATE device_commands
				SET status = $1
				WHERE command_id = $2
				RETURNING *`;
			params = [status, commandId];
		}

		const queryResult = await pgPool.query(query, params);

		console.log(`[Command Processor] Updated command ${commandId} status to ${status}`);

		return queryResult.rows[0];
	} catch (error) {
		console.error("Error updating command status:", error.message);
		throw error;
	}
}

/**
 * Get pending commands for a device
 * @param {number} deviceId - Device identifier
 * @returns {Array} - List of pending commands
 */
async function getPendingCommands(deviceId) {
	try {
		const result = await pgPool.query(
			`SELECT * FROM device_commands
			WHERE device_id = $1 AND status = 'pending'
			ORDER BY
				CASE priority
					WHEN 'high' THEN 1
					WHEN 'normal' THEN 2
					WHEN 'low' THEN 3
				END,
				created_at ASC`,
			[deviceId]
		);

		console.log(
			`[Command Processor] Found ${result.rows.length} pending commands for device ${deviceId}`
		);

		return result.rows;
	} catch (error) {
		console.error("Error getting pending commands:", error.message);
		throw error;
	}
}

/**
 * Check for timed out commands and mark them
 * @param {number} deviceId - Device identifier (optional)
 * @returns {number} - Number of commands marked as timed out
 */
async function checkTimeouts(deviceId = null) {
	try {
		let query = `
			UPDATE device_commands
			SET status = 'timeout', completed_at = CURRENT_TIMESTAMP
			WHERE status IN ('pending', 'sent', 'executing')
			AND created_at + (timeout_seconds || ' seconds')::INTERVAL < CURRENT_TIMESTAMP
		`;

		const params = [];

		if (deviceId !== null) {
			query += ` AND device_id = $1`;
			params.push(deviceId);
		}

		query += ` RETURNING command_id`;

		const result = await pgPool.query(query, params);

		if (result.rows.length > 0) {
			console.log(
				`[Command Processor] Marked ${result.rows.length} commands as timed out`
			);
		}

		return result.rows.length;
	} catch (error) {
		console.error("Error checking timeouts:", error.message);
		throw error;
	}
}

module.exports = {
	createCommand,
	getCommandStatus,
	updateCommandStatus,
	getPendingCommands,
	checkTimeouts,
};
