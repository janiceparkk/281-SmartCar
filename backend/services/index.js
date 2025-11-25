const {
	registerSmartCar,
	verifyCarTable,
	getSmartCarById,
	updateCarTelemetry,
} = require("./carService");

const { registerUser, authenticateUser } = require("./userService");

const {
	logAudioAlert,
	acknowledgeAlert,
	closeAlert,
	createTestAlert,
} = require("../controllers/alertController");

const {
	googleAuth,
	googleAuthCallback,
	requireJWTAuth,
	getUserInfo,
	logout,
	handleWebSocketConnection,
} = require("./authService");

module.exports = {
	// Car services
	registerSmartCar,
	verifyCarTable,
	getSmartCarById,
	updateCarTelemetry,

	// User services
	registerUser,
	authenticateUser,

	// Alert services
	logAudioAlert,
	acknowledgeAlert,
	closeAlert,
	createTestAlert,

	// Auth services
	googleAuth,
	googleAuthCallback,
	requireJWTAuth,
	getUserInfo,
	logout,
	handleWebSocketConnection,
};
