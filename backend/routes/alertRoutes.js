const express = require("express");
const router = express.Router();

const { authMiddleware } = require("./helper");
const {
	acknowledgeAlert,
	closeAlert,
	createTestAlert,
	getAlerts,
} = require("../controllers/alertController");

router.use(authMiddleware);

/**
 * @route   POST /api/alerts/:alertId/ack
 * @desc    Acknowledge an alert
 * @access  Private
 */
router.post("/:alertId/ack", async (req, res) => {
	try {
		const { alertId } = req.params;
		const updatedAlert = await acknowledgeAlert(alertId);

		if (!updatedAlert) {
			return res
				.status(404)
				.json({ message: `Alert with ID ${alertId} not found.` });
		}

		res.json(updatedAlert);
	} catch (error) {
		console.error("Error acknowledging alert:", error);
		res.status(500).json({
			message: "Server error while acknowledging alert.",
		});
	}
});

/**
 * @route   POST /api/alerts/:alertId/close
 * @desc    Close (resolve) an alert
 * @access  Private
 */
router.post("/:alertId/close", async (req, res) => {
	try {
		const { alertId } = req.params;
		const updatedAlert = await closeAlert(alertId);

		if (!updatedAlert) {
			return res
				.status(404)
				.json({ message: `Alert with ID ${alertId} not found.` });
		}

		res.json(updatedAlert);
	} catch (error) {
		console.error("Error closing alert:", error);
		res.status(500).json({ message: "Server error while closing alert." });
	}
});

/**
 * @route   POST /api/alerts/test
 * @desc    Create a test alert (Admin only). Accepts a JSON body to override default test data.
 * @access  Private (Admin)
 */
router.post("/test", async (req, res) => {
	if (req.user.role !== "Admin") {
		return res.status(403).json({
			message:
				"Forbidden: You do not have permission to create test alerts.",
		});
	}

	try {
		// Pass the request body to the controller. If body is empty, the controller will use its default.
		const newAlert = await createTestAlert(req.body);
		res.status(201).json(newAlert);
	} catch (error) {
		console.error("Error creating test alert:", error);
		res.status(500).json({
			message: "Server error while creating a test alert.",
		});
	}
});

/**
 * @route   GET /api/alerts
 * @desc    Get all alerts, with optional filtering by query params (status, car_id, alert_type)
 * @access  Private
 */
router.get("/", async (req, res) => {
	try {
		const alerts = await getAlerts(req.query);
		res.json(alerts);
	} catch (error) {
		console.error("Error getting alerts:", error);
		res.status(500).json({ message: "Server error while getting alerts." });
	}
});

module.exports = router;
