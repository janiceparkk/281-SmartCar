const {
	registerSmartCar,
	verifyCarTable,
	getSmartCarById,
	updateCarTelemetry,
} = require("./carService");

const { registerUser, authenticateUser } = require("./userService");

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
