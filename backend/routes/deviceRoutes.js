const express = require("express");
const router = express.Router();
const { pgPool } = require("../config/database");
const { authMiddleware } = require("./helper");
const {
	registerDevice,
	getDevices,
	getActiveDevices,
	getDeviceById,
	getDeviceStatus,
	updateDeviceHeartbeat,
	submitTelemetry,
	getDeviceTelemetry,
	sendDeviceCommand,
	getDeviceCommandStatus,
	getAllFirmwareVersions,
	addFirmwareVersion,
	updateDeviceFirmware,
	getFleetHealthOverview,
	getFleetAnalyticsData,
	getFleetMapData,
	getDeviceDiagnosticsData,
} = require("../controllers/deviceController");

// Apply authentication middleware to all device routes
router.use(authMiddleware);

// POST /api/devices/register
// Register a new IoT device
router.post("/register", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;

		// Extract device data from request body
		const { deviceType, carId, firmwareVersion, certificate } = req.body;

		// Validate required fields
		if (!deviceType || !carId) {
			return res.status(400).json({
				message: "Missing required fields: deviceType, carId",
			});
		}

		// Permission check: Only Admin or car owner can register devices
		if (userRole === "CarOwner") {
			// Verify the car belongs to the user
			const carCheck = await pgPool.query(
				"SELECT car_id FROM smart_cars WHERE car_id = $1 AND user_id = $2",
				[carId, userId]
			);

			if (carCheck.rows.length === 0) {
				return res.status(403).json({
					message: "Not authorized to register devices for this car",
				});
			}
		}

		// Register the device
		const newDevice = await registerDevice({
			deviceType,
			carId,
			firmwareVersion,
			certificate,
		});

		res.status(201).json({
			message: "Device registered successfully",
			device: newDevice.device,
			mqttCredentials: newDevice.mqttCredentials,
		});
	} catch (error) {
		console.error("Device Registration Error:", error.message);
		res.status(500).json({
			message:
				error.message ||
				"Failed to register device due to server error.",
		});
	}
});

// GET /api/devices
// Get all devices (filtered by user role)
router.get("/", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;

		// Get query parameters for filtering
		const { carId, deviceType, status } = req.query;

		const devices = await getDevices({
			userRole,
			userId,
			carId,
			deviceType,
			status,
		});

		res.status(200).json({
			message: "Devices retrieved successfully",
			count: devices.length,
			devices: devices,
		});
	} catch (error) {
		console.error("Get Devices Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve devices due to server error.",
		});
	}
});

// GET /api/devices/active
// Get all active devices
router.get("/active", async (req, res) => {
	try {
		const devices = await getActiveDevices();

		res.status(200).json({
			message: "Active devices retrieved successfully",
			count: devices.length,
			data: devices,
		});
	} catch (error) {
		console.error("Get Active Devices Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve active devices due to server error.",
		});
	}
});

// GET /api/devices/:deviceId
// Get a specific device by ID
router.get("/:deviceId", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const device = await getDeviceById({
			deviceId,
			userRole,
			userId,
		});

		if (!device) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Device retrieved successfully",
			device: device,
		});
	} catch (error) {
		console.error("Get Device By ID Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve device due to server error.",
		});
	}
});

// GET /api/devices/:deviceId/status
// Get device connection status and history
router.get("/:deviceId/status", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const status = await getDeviceStatus({
			deviceId,
			userRole,
			userId,
		});

		if (!status) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Device status retrieved successfully",
			status: status,
		});
	} catch (error) {
		console.error("Get Device Status Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve device status due to server error.",
		});
	}
});

// POST /api/devices/:deviceId/heartbeat
// Update device heartbeat timestamp
router.post("/:deviceId/heartbeat", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const updatedDevice = await updateDeviceHeartbeat({
			deviceId,
			userRole,
			userId,
		});

		if (!updatedDevice) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Heartbeat updated successfully",
			device: {
				device_id: updatedDevice.device_id,
				status: updatedDevice.status,
				last_heartbeat: updatedDevice.last_heartbeat,
			},
		});
	} catch (error) {
		console.error("Update Heartbeat Error:", error.message);
		res.status(500).json({
			message: "Failed to update heartbeat due to server error.",
		});
	}
});

// POST /api/devices/:deviceId/telemetry
// Submit telemetry data for a device
router.post("/:deviceId/telemetry", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const telemetryData = req.body;

		const telemetry = await submitTelemetry({
			deviceId,
			userRole,
			userId,
			telemetryData,
		});

		if (!telemetry) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(201).json({
			message: "Telemetry data submitted successfully",
			telemetry: telemetry,
		});
	} catch (error) {
		console.error("Submit Telemetry Error:", error.message);
		res.status(500).json({
			message: "Failed to submit telemetry due to server error.",
		});
	}
});

// GET /api/devices/:deviceId/telemetry
// Get telemetry data for a device
router.get("/:deviceId/telemetry", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		// Get query parameters
		const { limit, offset, startDate, endDate } = req.query;

		const options = {
			limit: limit ? parseInt(limit) : 100,
			offset: offset ? parseInt(offset) : 0,
			startDate: startDate || null,
			endDate: endDate || null,
		};

		const telemetry = await getDeviceTelemetry({
			deviceId,
			userRole,
			userId,
			options,
		});

		if (telemetry === null) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Telemetry data retrieved successfully",
			count: telemetry.length,
			telemetry: telemetry,
		});
	} catch (error) {
		console.error("Get Telemetry Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve telemetry due to server error.",
		});
	}
});

// POST /api/devices/:deviceId/commands
// Send a command to a device
router.post("/:deviceId/commands", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const commandData = req.body;

		// Validate required fields
		if (!commandData.command_type) {
			return res.status(400).json({
				message: "Missing required field: command_type",
			});
		}

		const command = await sendDeviceCommand({
			deviceId,
			userRole,
			userId,
			commandData,
		});

		if (!command) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(201).json({
			message: "Command created successfully",
			command: command,
		});
	} catch (error) {
		console.error("Send Command Error:", error.message);
		res.status(500).json({
			message:
				error.message || "Failed to send command due to server error.",
		});
	}
});

// GET /api/devices/:deviceId/commands/:commandId/status
// Get command status
router.get("/:deviceId/commands/:commandId/status", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);
		const commandId = req.params.commandId; // UUID, keep as string

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const command = await getDeviceCommandStatus({
			deviceId,
			commandId,
			userRole,
			userId,
		});

		if (!command) {
			return res.status(404).json({
				message: `Command with ID ${commandId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Command status retrieved successfully",
			command: command,
		});
	} catch (error) {
		console.error("Get Command Status Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve command status due to server error.",
		});
	}
});

// GET /api/devices/firmware/versions
// Get all firmware versions
router.get("/firmware/versions", async (req, res) => {
	try {
		const { device_type } = req.query;

		const firmwareVersions = await getAllFirmwareVersions({ device_type });

		res.status(200).json({
			message: "Firmware versions retrieved successfully",
			count: firmwareVersions.length,
			firmware: firmwareVersions,
		});
	} catch (error) {
		console.error("Get Firmware Versions Error:", error.message);
		res.status(500).json({
			message:
				"Failed to retrieve firmware versions due to server error.",
		});
	}
});

// POST /api/devices/firmware/versions
// Create a new firmware version (Admin only)
router.post("/firmware/versions", async (req, res) => {
	try {
		const userRole = req.user.role;

		// Only Admin can create firmware versions
		if (userRole !== "Admin") {
			return res.status(403).json({
				message: "Only administrators can create firmware versions",
			});
		}

		const firmwareData = req.body;

		// Validate required fields
		if (!firmwareData.version || !firmwareData.device_type) {
			return res.status(400).json({
				message: "Missing required fields: version, device_type",
			});
		}

		const firmware = await addFirmwareVersion({ firmwareData });

		res.status(201).json({
			message: "Firmware version created successfully",
			firmware: firmware,
		});
	} catch (error) {
		console.error("Create Firmware Version Error:", error.message);
		res.status(500).json({
			message:
				error.message ||
				"Failed to create firmware version due to server error.",
		});
	}
});

// POST /api/devices/:deviceId/firmware/update
// Update device firmware
router.post("/:deviceId/firmware/update", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const { target_version } = req.body;

		if (!target_version) {
			return res.status(400).json({
				message: "Missing required field: target_version",
			});
		}

		const updateResult = await updateDeviceFirmware({
			deviceId,
			userRole,
			userId,
			targetVersion: target_version,
		});

		if (!updateResult) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Firmware update initiated successfully",
			update: updateResult,
		});
	} catch (error) {
		console.error("Update Firmware Error:", error.message);
		res.status(500).json({
			message:
				error.message ||
				"Failed to update firmware due to server error.",
		});
	}
});

// GET /api/devices/fleet/health
// Get fleet health overview
router.get("/fleet/health", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;

		const health = await getFleetHealthOverview({ userRole, userId });

		res.status(200).json({
			message: "Fleet health retrieved successfully",
			health: health,
		});
	} catch (error) {
		console.error("Get Fleet Health Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve fleet health due to server error.",
		});
	}
});

// GET /api/devices/fleet/analytics
// Get fleet analytics and insights
router.get("/fleet/analytics", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;

		const analytics = await getFleetAnalyticsData({ userRole, userId });

		res.status(200).json({
			message: "Fleet analytics retrieved successfully",
			analytics: analytics,
		});
	} catch (error) {
		console.error("Get Fleet Analytics Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve fleet analytics due to server error.",
		});
	}
});

// GET /api/devices/fleet/map
// Get fleet map data
router.get("/fleet/map", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;

		const mapData = await getFleetMapData({ userRole, userId });

		res.status(200).json({
			message: "Fleet map data retrieved successfully",
			count: mapData.length,
			devices: mapData,
		});
	} catch (error) {
		console.error("Get Fleet Map Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve fleet map data due to server error.",
		});
	}
});

// GET /api/devices/:deviceId/diagnostics
// Get device diagnostics
router.get("/:deviceId/diagnostics", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);

		if (isNaN(deviceId)) {
			return res.status(400).json({
				message: "Invalid device ID format",
			});
		}

		const diagnostics = await getDeviceDiagnosticsData({
			deviceId,
			userRole,
			userId,
		});

		if (!diagnostics) {
			return res.status(404).json({
				message: `Device with ID ${deviceId} not found or access denied`,
			});
		}

		res.status(200).json({
			message: "Device diagnostics retrieved successfully",
			diagnostics: diagnostics,
		});
	} catch (error) {
		console.error("Get Device Diagnostics Error:", error.message);
		res.status(500).json({
			message:
				"Failed to retrieve device diagnostics due to server error.",
		});
	}
});

module.exports = router;
