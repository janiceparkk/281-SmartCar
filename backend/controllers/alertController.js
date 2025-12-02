const { Alert } = require("../routes/mongoSchema");
const { logAudioAlert } = require("../services/alertService");

/**
 * Acknowledges an alert by its ID.
 * @param {string} alertId The unique ID of the alert.
 * @returns {Promise<object|null>} The updated alert object, or null if not found.
 */
async function acknowledgeAlert(alertId) {
	try {
		const updatedAlert = await Alert.findOneAndUpdate(
			{ alert_id: alertId },
			{ $set: { status: "Acknowledged" } },
			{ new: true } // Return the modified document
		);
		return updatedAlert;
	} catch (error) {
		console.error(`[DB] Failed to acknowledge alert ${alertId}:`, error);
		throw error;
	}
}

/**
 * Closes (resolves) an alert by its ID.
 * @param {string} alertId The unique ID of the alert.
 * @returns {Promise<object|null>} The updated alert object, or null if not found.
 */
async function closeAlert(alertId) {
	try {
		const updatedAlert = await Alert.findOneAndUpdate(
			{ alert_id: alertId },
			{ $set: { status: "Resolved", resolved_at: new Date() } },
			{ new: true } // Return the modified document
		);
		return updatedAlert;
	} catch (error) {
		console.error(`[DB] Failed to close alert ${alertId}:`, error);
		throw error;
	}
}

// Define a default object to maintain old behavior if no data is passed
const defaultTestAlertData = {
	carId: "CAR-TEST-001",
	type: "siren",
	classification: "EmergencyVehicleSiren",
	confidence: 0.95,
};

/**
 * Creates a test alert for administrative purposes.
 * @param {object} alertData - The data for the test alert.
 * @returns {Promise<object>} The newly created test alert object.
 */
async function createTestAlert(alertData = defaultTestAlertData) {
	try {
		// Use the provided alertData instead of a hardcoded object
		const newAlert = await logAudioAlert(alertData);
		console.log(`[DB] Created a new test alert: ${newAlert.alert_id}`);
		return newAlert;
	} catch (error) {
		console.error("[DB] Failed to create a test alert:", error);
		throw error;
	}
}

/**
 * Retrieves a list of alerts, with optional filtering.
 * @param {object} queryParams - The query parameters from the request (e.g., for filtering).
 * @returns {Promise<Array>} A list of alert objects.
 */
async function getAlerts(queryParams = {}) {
	try {
		const filter = {};
		// Build filter object based on provided query parameters
		if (queryParams.status) {
			filter.status = queryParams.status;
		}
		if (queryParams.car_id) {
			filter.car_id = queryParams.car_id;
		}
		if (queryParams.alert_type) {
			filter.alert_type = queryParams.alert_type;
		}

		const alerts = await Alert.find(filter).sort({ createdAt: -1 });
		return alerts;
	} catch (error) {
		console.error("[DB] Failed to get alerts:", error);
		throw error;
	}
}

/**
 * Creates a manual alert from user input and triggers the notification workflow.
 * @param {object} alertData - The data for the manual alert from the request body.
 * @returns {Promise<object>} The newly created alert object.
 */
async function createManualAlert(alertData) {

	if (!alertData.carId || !alertData.type) {
		throw new Error("carId and type are required for a manual alert.");
	}

	try {
		// reuse the logAudioAlert service
		// A manual alert is considered high confidence by default.
		const fullAlertData = {
			confidence: 1.0,
			classification: "Manual Entry",
			...alertData,
		};
		const newAlert = await logAudioAlert(fullAlertData);
		console.log(`[Controller] Manual alert created via service: ${newAlert.alert_id}`);
		return newAlert;
	} catch (error) {
		console.error("[Controller] Failed to create a manual alert:", error.message);
		throw error;
	}
}

/**
 * Updates an existing alert with new information (e.g., notes, assignment).
 * @param {string} alertId The unique ID of the alert to update.
 * @param {object} updateData The fields to update.
 * @returns {Promise<object|null>} The updated alert object, or null if not found.
 */
async function updateAlert(alertId, updateData) {
	// only allowedUpdates fields can be updated
	const allowedUpdates = ["status", "assigned_to", "resolution_notes"];
	const finalUpdateData = {};

	for (const key of allowedUpdates) {
		if (updateData[key] !== undefined) {
			finalUpdateData[key] = updateData[key];
		}
	}

	if (Object.keys(finalUpdateData).length === 0) {
		throw new Error("No valid fields provided for update.");
	}

	try {
		const updatedAlert = await Alert.findOneAndUpdate(
			{ alert_id: alertId },
			{ $set: finalUpdateData },
			{ new: true } // Return the modified document
		);
		return updatedAlert;
	} catch (error) {
		console.error(`[DB] Failed to update alert ${alertId}:`, error);
		throw error;
	}
}

module.exports = {
	acknowledgeAlert,
	closeAlert,
	createTestAlert,
    getAlerts,
	createManualAlert,
    updateAlert,
};
