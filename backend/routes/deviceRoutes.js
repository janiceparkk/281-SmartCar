const express = require("express");
const router = express.Router();

/**
 * Initializes and returns the Device Management Router.
 * @param {object} dependencies - Object containing necessary services, models, and middleware.
 * @param {function} dependencies.authMiddleware - Middleware to verify JWT.
 * @param {function} dependencies.adminMiddleware - Middleware to verify Admin role.
 * @param {object} dependencies.pgPool - PostgreSQL connection pool.
 * @param {function} dependencies.registerDevice - Service function to register a device.
 * @param {function} dependencies.getDeviceById - Service function to get device by ID.
 * @param {function} dependencies.getDevicesByCarId - Service function to get devices by car ID.
 * @param {function} dependencies.updateDeviceStatus - Service function to update device status.
 * @param {function} dependencies.userOwnsCar - Service function to check car ownership.
 */
module.exports = function deviceRouter({
	authMiddleware,
	adminMiddleware,
	pgPool,
	registerDevice,
	getDeviceById,
	getDevicesByCarId,
	updateDeviceStatus,
	userOwnsCar,
}) {
	// POST /api/devices/register - Single device registration
	router.post("/register", authMiddleware, async (req, res) => {
		try {
			const { deviceId, deviceType, carId, firmwareVersion, certificate } = req.body;

			// Validate required fields
			if (!deviceId || !deviceType || !carId) {
				return res.status(400).json({
					message: "deviceId, deviceType, and carId are required.",
				});
			}

			// Security check: CarOwner can only register devices for their own cars
			if (req.user.role === "CarOwner") {
				const ownsThisCar = await userOwnsCar(req.user.id, carId);
				if (!ownsThisCar) {
					return res.status(403).json({
						message: "Not authorized to register devices for this car.",
					});
				}
			}

			const newDevice = await registerDevice({
				deviceId,
				deviceType,
				carId,
				firmwareVersion,
				certificate,
			});

			res.status(201).json({
				deviceId: newDevice.device_id,
				status: newDevice.status,
				mqttCredentials: {
					clientId: newDevice.mqtt_client_id,
					username: `device_${newDevice.device_id}`,
					password: "generated_password_placeholder", // TODO: Generate secure password
					broker: "mqtt://localhost:1883",
				},
			});
		} catch (error) {
			console.error("Device registration error:", error);
			res.status(500).json({
				message: "Failed to register device.",
				error: error.message,
			});
		}
	});

	// POST /api/devices/bulk-register - Bulk device registration
	router.post("/bulk-register", authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const { devices, csvData } = req.body;
			let devicesToRegister = [];

			// Handle CSV data if provided
			if (csvData) {
				devicesToRegister = parseDeviceCSV(csvData);
			} else if (Array.isArray(devices)) {
				devicesToRegister = devices;
			} else {
				return res.status(400).json({
					message: "Either devices array or csvData is required.",
				});
			}

			if (devicesToRegister.length === 0) {
				return res.status(400).json({
					message: "No devices to register.",
				});
			}

			let success = 0;
			let failed = 0;
			const errors = [];

			for (const deviceData of devicesToRegister) {
				try {
					await registerDevice(deviceData);
					success++;
				} catch (error) {
					failed++;
					errors.push({
						deviceId: deviceData.deviceId,
						error: error.message,
					});
				}
			}

			res.status(200).json({
				success,
				failed,
				errors,
				total: devicesToRegister.length,
			});
		} catch (error) {
			console.error("Bulk device registration error:", error);
			res.status(500).json({
				message: "Bulk registration failed.",
				error: error.message,
			});
		}
	});

	// Helper function to parse CSV data for device registration
	function parseDeviceCSV(csvData) {
		try {
			const lines = csvData.trim().split('\n');
			if (lines.length < 2) {
				throw new Error("CSV must have header and at least one data row");
			}

			// Expected CSV format: deviceId,deviceType,carId,firmwareVersion,certificate
			const headers = lines[0].split(',').map(h => h.trim());
			const expectedHeaders = ['deviceId', 'deviceType', 'carId', 'firmwareVersion', 'certificate'];
			
			// Validate headers
			const hasRequiredHeaders = expectedHeaders.slice(0, 3).every(h => headers.includes(h));
			if (!hasRequiredHeaders) {
				throw new Error("CSV must have headers: deviceId, deviceType, carId (firmwareVersion and certificate are optional)");
			}

			const devices = [];
			for (let i = 1; i < lines.length; i++) {
				const values = lines[i].split(',').map(v => v.trim());
				if (values.length < 3) continue; // Skip incomplete rows

				const device = {};
				headers.forEach((header, index) => {
					if (values[index]) {
						device[header] = values[index];
					}
				});

				devices.push(device);
			}

			return devices;
		} catch (error) {
			throw new Error(`CSV parsing failed: ${error.message}`);
		}
	}

	// GET /api/devices - List devices (filtered by user role)
	router.get("/", authMiddleware, async (req, res) => {
		try {
			const { status, deviceType, carId } = req.query;
			let query = 'SELECT * FROM iot_devices WHERE 1=1';
			const params = [];
			let paramIndex = 1;

			// Apply filters
			if (status) {
				query += ` AND status = $${paramIndex}`;
				params.push(status);
				paramIndex++;
			}

			if (deviceType) {
				query += ` AND device_type = $${paramIndex}`;
				params.push(deviceType);
				paramIndex++;
			}

			if (carId) {
				query += ` AND car_id = $${paramIndex}`;
				params.push(carId);
				paramIndex++;
			}

			// For CarOwners, only show devices for their cars
			if (req.user.role === "CarOwner") {
				query += ` AND car_id IN (SELECT car_id FROM smart_cars WHERE user_id = $${paramIndex})`;
				params.push(req.user.id);
			}

			query += ' ORDER BY created_at DESC';

			const result = await pgPool.query(query, params);
			res.json(result.rows);
		} catch (error) {
			console.error("Error fetching devices:", error);
			res.status(500).json({
				message: "Failed to retrieve devices from database.",
			});
		}
	});

	// GET /api/devices/{deviceId} - Get device details
	router.get("/:deviceId", authMiddleware, async (req, res) => {
		try {
			const { deviceId } = req.params;
			const device = await getDeviceById(deviceId);

			if (!device) {
				return res.status(404).json({
					message: "Device not found.",
				});
			}

			// Security check: CarOwner can only view devices for their cars
			if (req.user.role === "CarOwner") {
				const ownsThisCar = await userOwnsCar(req.user.id, device.car_id);
				if (!ownsThisCar) {
					return res.status(403).json({
						message: "Not authorized to view this device.",
					});
				}
			}

			res.json(device);
		} catch (error) {
			console.error("Error fetching device:", error);
			res.status(500).json({
				message: "Failed to retrieve device.",
			});
		}
	});

	// GET /api/devices/{deviceId}/connection-status - Real-time connection status
	router.get("/:deviceId/connection-status", authMiddleware, async (req, res) => {
		try {
			const { deviceId } = req.params;
			const device = await getDeviceById(deviceId);

			if (!device) {
				return res.status(404).json({
					message: "Device not found.",
				});
			}

			// Security check: CarOwner can only view devices for their cars
			if (req.user.role === "CarOwner") {
				const ownsThisCar = await userOwnsCar(req.user.id, device.car_id);
				if (!ownsThisCar) {
					return res.status(403).json({
						message: "Not authorized to view this device.",
					});
				}
			}

			// Calculate connection status based on last heartbeat
			const now = new Date();
			const lastHeartbeat = new Date(device.last_heartbeat);
			const minutesOffline = Math.floor((now - lastHeartbeat) / (1000 * 60));

			let connectionStatus = "No Connection";
			if (minutesOffline < 1) connectionStatus = "Online";
			else if (minutesOffline <= 5) connectionStatus = "Idle";
			else if (minutesOffline <= 30) connectionStatus = "Offline";

			res.json({
				deviceId: device.device_id,
				status: connectionStatus,
				lastHeartbeat: device.last_heartbeat,
				connectionQuality: device.connection_quality || {},
				sessionInfo: {
					mqttClientId: device.mqtt_client_id,
					firmwareVersion: device.firmware_version,
				},
			});
		} catch (error) {
			console.error("Error fetching device connection status:", error);
			res.status(500).json({
				message: "Failed to retrieve device connection status.",
			});
		}
	});

	// GET /api/devices/inventory - Device inventory management (Admin only)
	router.get("/inventory", authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const { page = 1, limit = 50 } = req.query;
			const offset = (page - 1) * limit;

			// Get total count
			const countResult = await pgPool.query('SELECT COUNT(*) FROM iot_devices');
			const total = parseInt(countResult.rows[0].count);

			// Get paginated devices with car information
			const query = `
				SELECT 
					d.device_id,
					d.device_type,
					d.status,
					d.firmware_version,
					d.last_heartbeat,
					d.connection_quality,
					d.created_at,
					c.car_id,
					c.model as car_model,
					c.user_id as owner_id
				FROM iot_devices d
				LEFT JOIN smart_cars c ON d.car_id = c.car_id
				ORDER BY d.created_at DESC
				LIMIT $1 OFFSET $2
			`;

			const result = await pgPool.query(query, [limit, offset]);

			// Calculate inventory statistics
			const statsQuery = `
				SELECT 
					COUNT(*) as total_devices,
					COUNT(*) FILTER (WHERE status = 'Online') as online_devices,
					COUNT(*) FILTER (WHERE status = 'Offline') as offline_devices,
					COUNT(*) FILTER (WHERE status = 'Maintenance') as maintenance_devices,
					COUNT(DISTINCT device_type) as device_types,
					COUNT(DISTINCT car_id) as cars_with_devices
				FROM iot_devices
			`;
			const statsResult = await pgPool.query(statsQuery);

			res.json({
				devices: result.rows,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / limit),
					hasNext: offset + result.rows.length < total,
				},
				statistics: statsResult.rows[0],
			});
		} catch (error) {
			console.error("Error fetching device inventory:", error);
			res.status(500).json({
				message: "Failed to retrieve device inventory.",
			});
		}
	});

	// PATCH /api/devices/{deviceId} - Update device information  
	router.patch("/:deviceId", authMiddleware, async (req, res) => {
		try {
			const { deviceId } = req.params;
			const { status, firmwareVersion, deviceType } = req.body;

			const device = await getDeviceById(deviceId);
			if (!device) {
				return res.status(404).json({
					message: "Device not found.",
				});
			}

			// Security check: CarOwner can only update devices for their cars
			if (req.user.role === "CarOwner") {
				const ownsThisCar = await userOwnsCar(req.user.id, device.car_id);
				if (!ownsThisCar) {
					return res.status(403).json({
						message: "Not authorized to update this device.",
					});
				}
			}

			// Build update query dynamically based on provided fields
			const updates = [];
			const params = [];
			let paramIndex = 1;

			if (status) {
				updates.push(`status = $${paramIndex}`);
				params.push(status);
				paramIndex++;
			}

			if (firmwareVersion) {
				updates.push(`firmware_version = $${paramIndex}`);
				params.push(firmwareVersion);
				paramIndex++;
			}

			if (deviceType) {
				updates.push(`device_type = $${paramIndex}`);
				params.push(deviceType);
				paramIndex++;
			}

			updates.push(`updated_at = NOW()`);
			params.push(deviceId);

			const query = `
				UPDATE iot_devices
				SET ${updates.join(', ')}
				WHERE device_id = $${paramIndex}
				RETURNING *
			`;

			const result = await pgPool.query(query, params);
			res.json(result.rows[0]);
		} catch (error) {
			console.error("Error updating device:", error);
			res.status(500).json({
				message: "Failed to update device.",
			});
		}
	});

	return router;
};