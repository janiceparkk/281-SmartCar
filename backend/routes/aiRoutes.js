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
 * @route   POST /api/ai/process-audio
 * @desc    Receives an audio file, analyzes it, and creates an alert if necessary.
 * @access  Private
 * @param   {File} audio - The audio file to be uploaded.
 */
router.post(
	"/process-audio",
	authMiddleware, // Using user auth for now, can be replaced with device-specific auth later
	upload.single("audio"),
	processAudio
);

module.exports = router;
