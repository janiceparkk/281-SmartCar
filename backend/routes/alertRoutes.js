const express = require("express");
const router = express.Router();

const { authMiddleware } = require("./helper");
const {
	acknowledgeAlert,
	closeAlert,
	createTestAlert,
} = require("../services");

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
		res.status(500).json({ message: "Server error while acknowledging alert." });
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
 * @desc    Create a test alert (Admin only)
 * @access  Private (Admin)
 */
router.post("/test", async (req, res) => {
	// Role-based access control
	if (req.user.role !== "Admin") {
		return res.status(403).json({
			message: "Forbidden: You do not have permission to create test alerts.",
		});
	}

	try {
		const newAlert = await createTestAlert();
		res.status(201).json(newAlert);
	} catch (error) {
		console.error("Error creating test alert:", error);
		res.status(500).json({ message: "Server error while creating a test alert." });
	}
});

module.exports = router;
