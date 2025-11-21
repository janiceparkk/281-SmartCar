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

module.exports = {
	logAudioAlert,
};
