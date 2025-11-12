const express = require("express");
const router = express.Router();
const { pgPool } = require("../config/database");
const { authMiddleware } = require("./helper");
const {
	registerDevice,
	getDevices,
	getActiveDevices,
	getDeviceById,
	updateDevice,
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
router.get("/active", async (req, res) => {
	try {
		const activeDevices = await getActiveDevices();

		res.status(200).json({
			message: "Active Devices retrieved successfully",
			count: activeDevices.length,
			devices: activeDevices,
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

// PATCH /api/devices/:deviceId
router.patch("/:deviceId", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const deviceId = parseInt(req.params.deviceId);
		const updates = req.body;

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

		let deviceStatus = device.status;
		let deviceTimestamp = device.last_heartbeat;

		if (updates.updateStatus != undefined || updates.updateStatus != null) {
			deviceStatus = updates.updateStatus;
		}

		if (
			updates.updateTimestamp != undefined ||
			updates.updateTimestamp != null
		) {
			deviceTimestamp = updates.updateTimestamp;
		}

		const updatedDevice = await updateDevice({
			deviceId,
			userRole,
			userId,
			deviceStatus,
			deviceTimestamp,
		});
		res.status(200).json({
			message: "Device updated successfully",
			device: updatedDevice,
		});
	} catch (error) {
		console.error("Patch Device Error:", error.message);
		res.status(500).json({
			message: "Failed to update device due to server error.",
		});
	}
});

module.exports = router;
