const { Alert } = require("../routes/mongoSchema");

// Use module-level variable for the seed
let uniqueIdSeed = 1;

/** Logs a real-time audio alert event to the MongoDB store. */
async function logAudioAlert(alertData) {
	try {
		const newAlert = await Alert.create({
			alert_id: `ALERT-${Date.now()}-${uniqueIdSeed++}`,
			car_id: alertData.carId,
			alert_type: alertData.type,
			sound_classification: alertData.classification,
			confidence_score: alertData.confidence,
			status: "Active",
		});
		console.log(
			`[DB] Logged new alert: ${newAlert.alert_type} for ${newAlert.car_id}`
		);
		return newAlert.toObject();
	} catch (error) {
		console.error(
			`[DB] Failed to log alert for ${alertData.carId}:`,
			error
		);
		throw new Error("Database write failed");
	}
}

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

module.exports = {
	logAudioAlert,
	acknowledgeAlert,
	closeAlert,
	createTestAlert,
    getAlerts,
};
