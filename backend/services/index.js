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

module.exports = {
	// Car services
	registerSmartCar,
	verifyCarTable,
	getSmartCarById,
	updateCarTelemetry,

	// User services
	registerUser,
	authenticateUser,
};
