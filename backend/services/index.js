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
} = require("./alertService");

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
	  // Alert services
  logAudioAlert,
  acknowledgeAlert,
  closeAlert,
  createTestAlert,
};
