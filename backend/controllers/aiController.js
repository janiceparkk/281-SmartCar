const fs = require("fs");
const { analyzeAudio } = require("../services/aiService");
const { logAudioAlert } = require("../services/alertService");

/**
 * Core logic for handling audio file analysis.
 * It performs analysis but does NOT trigger alerts.
 * @param {object} req - The Express request object.
 * @returns {Promise<object|null>} A promise that resolves with the analysis result, or null if no file.
 */
async function handleAudioAnalysis(req) {
	if (!req.file) {
		return null; // Let the caller handle the response
	}

	const tempFilePath = req.file.path;

	try {
		const predictionResult = await analyzeAudio(tempFilePath);
		return predictionResult;
	} catch (error) {
		console.error("[aiController:Core] Error during audio analysis:", error.message);
		throw error;
	} finally {
		fs.unlink(tempFilePath, (err) => {
			if (err) {
				console.error(`[aiController:Core] Failed to delete temporary file: ${tempFilePath}`, err);
			}
		});
	}
}

/**
 * Controller for the /api/ai/process-audio endpoint.
 * Analyze AND Log Alert.
 */
async function processAudio(req, res) {
	try {
		const analysisResult = await handleAudioAnalysis(req);

		if (analysisResult === null) {
			return res.status(400).json({ message: "No audio file was uploaded." });
		}

		// If a valid prediction was made, pass it to the alert service to be logged and escalated
		if (analysisResult && analysisResult.prediction) {

			let alertType = analysisResult.prediction;
			if (alertType === "car_crash") {
				alertType = "collision";
			}

			const alertData = {
				carId: req.body.carId || "UNKNOWN_CAR",
				type: alertType,
				classification: analysisResult.prediction,
				confidence: analysisResult.confidence,
			};

			// log Alert and may notification
			await logAudioAlert(alertData);
		}

		return res.status(200).json({
			message: "Audio processed and alert workflow triggered successfully.",
			analysis: analysisResult,
		});

	} catch (error) {
		// Error is already logged by handleAudioAnalysis, just send response
		return res.status(500).json({ message: "An internal error occurred during audio processing." });
	}
}

module.exports = {
	processAudio,
	handleAudioAnalysis,
};
