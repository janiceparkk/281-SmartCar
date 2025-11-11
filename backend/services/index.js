const {
	registerSmartCar,
	verifyCarTable,
	getSmartCarById,
	updateCarTelemetry,
} = require("./carService");

const { registerUser, authenticateUser } = require("./userService");

const { logAudioAlert } = require("./alertService");

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
};
