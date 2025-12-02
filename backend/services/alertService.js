const { Alert } = require("../routes/mongoSchema");
const { getCarOwnerContactInfo } = require("./carService");
const notificationService = require("./notificationService");
const mqttService = require("./mqttService");

// Use module-level variable for the seed
let uniqueIdSeed = 1;

/**
 * Determine Alert Severity based on Decision Table
 */
function calculateSeverity(type, confidence) {
	// Collision with high confidence -> Critical
	if (type === "collision" && confidence >= 0.9) {
		return "Critical";
	}
	// Glass Break with high confidence -> Critical
	if (type === "glass_break" && confidence >= 0.8) {
		return "Critical";
	}
	// Siren with medium-high confidence -> High
	if (type === "siren" && confidence >= 0.7) {
		return "High";
	}
	// Default -> Low
	return "Low";
}

/**
 * Logs a real-time audio alert event to MongoDB and handles Escalation/Notification.
 */
async function logAudioAlert(alertData) {
	try {
		// Calculate Severity
		const severity = calculateSeverity(alertData.type, alertData.confidence);

		const newAlert = await Alert.create({
			alert_id: `ALERT-${Date.now()}-${uniqueIdSeed++}`,
			car_id: alertData.carId,
			alert_type: alertData.type,
			sound_classification: alertData.classification,
			confidence_score: alertData.confidence,
			status: "Active",
			severity: severity, // Ideally schema should have this, but Mongo is flexible
		});

		console.log(
			`[Alert Service] Logged ${severity} alert: ${newAlert.alert_type} for ${newAlert.car_id}`
		);

		// Escalation Logic (Notification & Real-time Push)
		// Only proceed if severity is High or Critical
		if (severity === "High" || severity === "Critical") {

			let owner = null;
			try {
				owner = await getCarOwnerContactInfo(alertData.carId);
			} catch (err) {
				console.error(`[Alert Service] Failed to fetch owner for ${alertData.carId}`, err.message);
			}

			// Real-time Push (MQTT) - For Dashboard/UI
			// Topic: alerts/{carId}
			const mqttPayload = {
				alertId: newAlert.alert_id,
				type: newAlert.alert_type,
				severity: severity,
				confidence: newAlert.confidence_score,
				timestamp: new Date(),
				message: `Detected ${newAlert.alert_type} with ${severity} severity.`
			};
			mqttService.publish(`devices/${alertData.carId}/alerts`, mqttPayload);
			// topic `alerts/all` for Admin Dashboard if needed
			mqttService.publish(`alerts/all`, mqttPayload);

			// Notification Dispatch (Critical Only)
			if (severity === "Critical" && owner) {
				const subject = `[CRITICAL] Security Alert for your ${owner.car_model}`;
				const message = `A critical event (${alertData.type}) was detected on your vehicle ${owner.car_model}. Please check your dashboard immediately.`;

				if (owner.email) {
					await notificationService.sendEmail(owner.email, subject, message);
				} else {
					console.log(`[Alert Service] Owner has no email, skipping email.`);
				}

				if (owner.phone) {
					await notificationService.sendSMS(owner.phone, message);
				} else {
					console.log(`[Alert Service] Owner has no phone, skipping SMS.`);
				}

				// PagerDuty (Simulated)
				console.log(`[Alert Service] PagerDuty Ticket Created [SIMULATION] for Alert ${newAlert.alert_id}`);
			}
		}

		return newAlert.toObject();

	} catch (error) {
		console.error(
			`[Alert Service] Failed to process alert for ${alertData.carId}:`,
			error
		);
		throw new Error("Alert processing failed");
	}
}

module.exports = {
	logAudioAlert,
};
