const fs = require("fs");
const { analyzeAudio } = require("../services/aiService");
const { logAudioAlert } = require("../services/alertService");

/**
 * Handles the audio processing workflow.
 */
async function processAudio(req, res) {
	if (!req.file) {
		return res.status(400).json({ message: "No audio file was uploaded." });
	}

	const tempFilePath = req.file.path;

	try {
		// Call the AI service for analysis
		const predictionResult = await analyzeAudio(tempFilePath);

		if (predictionResult && predictionResult.prediction) {

			let alertType = predictionResult.prediction;
			// Translate 'car_crash' to 'collision' to match the schema's preferred term
			if (alertType === 'car_crash') {
				alertType = 'collision';
			}

			const alertData = {
				carId: req.body.carId || "UNKNOWN_CAR",
				type: alertType,
				classification: predictionResult.prediction,
				confidence: predictionResult.confidence,
			};

			await logAudioAlert(alertData);
		}

		return res.status(200).json({
			message: "Audio processed successfully.",
			analysis: predictionResult,
		});

	} catch (error) {
		console.error("[aiController] Error processing audio:", error.message);
		return res.status(500).json({
			message: "An internal error occurred during audio analysis.",
		});
	} finally {
		// Clean up the temporary file
		fs.unlink(tempFilePath, (err) => {
			if (err) {
				console.error(`[aiController] Failed to delete temporary file: ${tempFilePath}`, err);
			}
		});
	}
}

module.exports = {
	processAudio,
};