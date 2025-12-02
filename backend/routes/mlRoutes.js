const express = require("express");
const router = express.Router();
const multer = require("multer");
const os = require("os");
const { authMiddleware } = require("./helper");
const { handleAudioAnalysis } = require("../controllers/aiController");

const upload = multer({ dest: os.tmpdir() });

router.use(authMiddleware);

/**
 * @route   GET /api/ml/health
 * @desc    Provides a simple health check for the ML service (simulated).
 * @access  Private
 */
router.get("/health", (req, res) => {
	// no real python microservice, only simulate
	res.status(200).json({
		status: "ok",
		timestamp: new Date().toISOString(),
		message: "ML service endpoint is active.",
	});
});

/**
 * @route   GET /api/ml/models
 * @desc    Lists the machine learning models currently in use by the system (hardcoded).
 * @access  Private
 */
router.get("/models", (req, res) => {
	// This list is hardcoded
	const models = [
		{
			id: "crnn_accident_model_v1",
			name: "CRNN Accident Model",
			version: "1.0",
			description: "Detects vehicle-related incidents like crashes, glass breaks, and general traffic noise.",
			tags: ["CRNN", "incident-detection"],
		},
		{
			id: "clap_zeroshot_v1",
			name: "CLAP Zero-Shot Classifier",
			version: "htsat-unfused",
			description: "Detects a wide range of audio events including sirens, human screams, and animal sounds using zero-shot classification.",
			tags: ["Transformer", "CLAP", "zero-shot"],
		},
	];

	res.status(200).json(models);
});

/**
 * @route   POST /api/ml/predictions
 * @desc    Performs online inference on an audio file and returns the result without creating an alert.
 * @access  Private
 */
router.post("/predictions", upload.single("audio"), async (req, res) => {
	try {
		// Call the core, reusable analysis function
		const analysisResult = await handleAudioAnalysis(req);

		if (analysisResult === null) {
			return res.status(400).json({ message: "No audio file was uploaded." });
		}

		// Directly return the analysis, without any side effects (like logging alerts)
		res.status(200).json({
			message: "Inference completed successfully.",
			prediction: analysisResult,
		});

	} catch (error) {
		// The error is already logged by the core function
		res.status(500).json({ message: "An internal error occurred during inference." });
	}
});

module.exports = router;
