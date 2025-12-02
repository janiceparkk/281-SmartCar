// test_models.js

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const BASE_URL = "http://localhost:5000/api";

/**
 * Logs in a user to get an authentication token.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<string>} The JWT token.
 */
async function getAuthToken(email, password) {
	try {
		console.log(`[1/3] Authenticating user: ${email}...`);
		const response = await axios.post(`${BASE_URL}/auth/login`, {
			email,
			password,
		});
		if (response.data && response.data.token) {
			console.log("✅ Authentication successful.");
			return response.data.token;
		}
		throw new Error("Login response did not include a token.");
	} catch (error) {
		console.error("❌ Authentication failed:", error.response ? error.response.data.message : error.message);
		process.exit(1); // Exit if login fails
	}
}

/**
 * Submits an audio file for analysis.
 * @param {string} token - The JWT authentication token.
 * @param {string} audioFilePath - The path to the audio file.
 * @param {string|number} carId - The car ID to associate with the event.
 */
async function testAudioProcessing(token, audioFilePath, carId) {
	try {
		console.log(`\n[2/3] Preparing to upload and process: ${path.basename(audioFilePath)}...`);

		const form = new FormData();
		form.append("audio", fs.createReadStream(audioFilePath));
		form.append("carId", carId.toString());

		const headers = {
			...form.getHeaders(),
			Authorization: `Bearer ${token}`,
		};

		const response = await axios.post(`${BASE_URL}/ai/process-audio`, form, { headers });

		console.log("✅ Audio processed successfully.");
		console.log("\n[3/3] Server Response:");
		console.log(JSON.stringify(response.data, null, 2)); // Pretty print the JSON response

	} catch (error) {
		console.error("❌ Error during audio processing:", error.response ? error.response.data : error.message);
		process.exit(1);
	}
}

/**
 * Main function to run the test script.
 */
async function main() {
	// Get arguments from command line
	const args = process.argv.slice(2);
	if (args.length < 4) {
		console.error("Usage: node test_models.js <email> <password> <carId> <audio_file_path>");
		console.error("\nExample: node test_models.js admin@test.com password123 228 ./audio_samples/siren.wav");
		return;
	}

	const [email, password, carId, audioFilePath] = args;

	if (!fs.existsSync(audioFilePath)) {
		console.error(`Error: Audio file not found at path: ${audioFilePath}`);
		return;
	}

	const token = await getAuthToken(email, password);
	await testAudioProcessing(token, audioFilePath, carId);
}

main();
