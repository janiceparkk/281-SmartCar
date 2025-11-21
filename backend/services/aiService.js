const { spawn } = require("child_process");
const path = require("path");

// Configuration for the Python script and model
// the Python script and model are in a 'ml' subfolder of the backend
const PYTHON_SCRIPT_PATH = path.join(__dirname, "..", "ml", "predict.py");
const MODEL_PATH = path.join(__dirname, "..", "ml", "accident_model.pth");
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";

/**
 * Analyzes an audio file by calling the Python prediction script.
 * @param {string} audioFilePath - The absolute path to the audio file to be analyzed.
 * @returns {Promise<object>} A promise that resolves with the prediction result object from the Python script.
 */
function analyzeAudio(audioFilePath) {
	return new Promise((resolve, reject) => {
		const process = spawn(PYTHON_EXECUTABLE, [
			PYTHON_SCRIPT_PATH,
			MODEL_PATH,
			audioFilePath,
		]);

		let stdoutData = "";
		let stderrData = "";

		// Listen for data from the script's standard output
		process.stdout.on("data", (data) => {
			stdoutData += data.toString();
		});

		// script's standard error
		process.stderr.on("data", (data) => {
			stderrData += data.toString();
		});

		// script finishing
		process.on("close", (code) => {
			// script exited with error
			if (code !== 0) {
				const errorMsg = `Python script exited with code ${code}. Stderr: ${stderrData}`;
				return reject(new Error(errorMsg));
			}

			if (stderrData) {
				console.warn(`[aiService] Python script stderr warning: ${stderrData}`);
			}
            // parse
			try {
				const result = JSON.parse(stdoutData);
				if (result.error) {
					return reject(new Error(`Prediction script returned an error: ${result.error}`));
				}
				resolve(result);
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
