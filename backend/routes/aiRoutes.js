const express = require("express");
const multer = require("multer");
const path = require("path");
const os = require("os");
const { processAudio } = require("../controllers/aiController");
const { authMiddleware } = require("./helper");

const router = express.Router();

// Configure multer for temporary file storage
// It will save uploaded files to the system's temporary directory
const upload = multer({ dest: os.tmpdir() });

/**
 * Service token middleware for CARLA bridge and other services
 * Allows service-to-service communication without user JWT
 */
const serviceTokenMiddleware = (req, res, next) => {
	const serviceToken =
		req.headers["x-service-token"] || req.body.serviceToken;
	const expectedToken =
		process.env.SERVICE_TOKEN || "carla-bridge-service-token";

	if (serviceToken === expectedToken) {
		// Create a mock user object for service requests
		req.user = { id: "service", role: "Service" };
		return next();
	}

	// If no service token, fall back to regular auth
	return authMiddleware(req, res, next);
};

/**
 * @route   POST /api/ai/process-audio
 * @desc    Receives an audio file, analyzes it, and creates an alert if necessary.
 * @access  Private (JWT or Service Token)
 * @param   {File} audio - The audio file to be uploaded.
 * @param   {String} carId - The car ID (in body or query)
 */
router.post(
	"/process-audio",
	serviceTokenMiddleware, // Supports both JWT and service token
	upload.single("audio"),
	processAudio
);

module.exports = router;
