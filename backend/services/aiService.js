const { spawn } = require("child_process");
const path = require("path");

// Configuration for the Python script and model
const PYTHON_SCRIPT_PATH = path.join(__dirname, "..", "ml", "predict.py");
const MODEL_PATH = path.join(__dirname, "..", "ml", "accident_model.pth"); // CRNN model path
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";

/**
 * A decision-making function to choose the best prediction from multiple models.
 * @param {object} crnnResult - The result from CRNN.
 * @param {object} clapResult - The result from CLAP.
 * @returns {object} The chosen prediction, e.g., { prediction, confidence, sourceModel }
 */
function decideBestPrediction(crnnResult, clapResult) {
	// Define classes that should always take precedence if confidence is high
	const highPriorityClasses = ["siren", "human scream", "gunshot", ];

	const hasCrnnError = !crnnResult || crnnResult.error;
	const hasClapError = !clapResult || clapResult.error;

	if (hasCrnnError && hasClapError) {
		return { prediction: "unknown", confidence: 0.0, sourceModel: "none", error: "Both models failed." };
	}
	if (hasCrnnError) {
		return { ...clapResult, sourceModel: "CLAP" };
	}
	if (hasClapError) {
		return { ...crnnResult, sourceModel: "CRNN" };
	}

	// If CLAP detects a high-priority event with significant confidence, prioritize it.
	if (highPriorityClasses.includes(clapResult.prediction) && clapResult.confidence > 0.7) {
		return { ...clapResult, sourceModel: "CLAP" };
	}

	// Otherwise, simply choose the one with the highest confidence
	if (crnnResult.confidence >= clapResult.confidence) {
		return { ...crnnResult, sourceModel: "CRNN" };
	} else {
		return { ...clapResult, sourceModel: "CLAP" };
	}
}


/**
 * Analyzes an audio file by calling the unified Python prediction script.
 * @param {string} audioFilePath - The absolute path to the audio file to be analyzed.
 * @returns {Promise<object>} A promise that resolves with the best prediction result.
 */
function analyzeAudio(audioFilePath) {
	return new Promise((resolve, reject) => {
		const process = spawn(PYTHON_EXECUTABLE, [
			PYTHON_SCRIPT_PATH,
			MODEL_PATH, // only CRNN model path
			audioFilePath,
		]);

		let stdoutData = "";
		let stderrData = "";

		process.stdout.on("data", (data) => {
			stdoutData += data.toString();
		});

		process.stderr.on("data", (data) => {
			stderrData += data.toString();
		});

		process.on("close", (code) => {
			if (code !== 0) {
				const errorMsg = `Python script exited with code ${code}. Stderr: ${stderrData}`;
				return reject(new Error(errorMsg));
			}

			if (stderrData) {
				console.warn(`[aiService] Python script stderr warning: ${stderrData}`);
			}
            
			try {
				const multiModelResult = JSON.parse(stdoutData);

				// Check for top-level errors from the python script itself
				if (multiModelResult.error) {
					return reject(new Error(`Prediction script returned an error: ${multiModelResult.error}`));
				}

				// Use the decider function to get the final result
				const bestPrediction = decideBestPrediction(
					multiModelResult.crnn_result,
					multiModelResult.clap_result
				);

				// final result
				resolve({
					prediction: bestPrediction.prediction,
					confidence: bestPrediction.confidence,
					_source: { // Add metadata for debugging
						model: bestPrediction.sourceModel,
						crnn: multiModelResult.crnn_result,
						clap: multiModelResult.clap_result
					}
				});

			} catch (e) {
				const errorMsg = `Failed to parse JSON from Python script. Stdout: ${stdoutData}`;
				reject(new Error(errorMsg));
			}
		});

		process.on("error", (err) => {
			reject(new Error(`Failed to start Python script: ${err.message}`));
		});
	});
}

module.exports = {
	analyzeAudio,
};