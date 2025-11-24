const express = require("express");
const router = express.Router();
const { pgPool } = require("../config/database");
const { authMiddleware } = require("./helper");
const {
	getIssueTypes,
	getServiceRequests,
	postServiceRequest,
	patchServiceRequest,
} = require("../controllers/serviceRequestController");

// Apply authentication middleware to all device routes
router.use(authMiddleware);

// POST /api/serviceRequests
// Create a new Service Request and Log
router.post("/", async (req, res) => {
	try {
		const { carId, issueId, description } = req.body;
		let status = "In Progress";

		if (!carId || !issueId) {
			return res.status(400).json({
				message: "Missing required fields: carId and issueId",
			});
		}

		const newRequest = await postServiceRequest({
			carId,
			issueId,
			status,
			description,
		});
		res.status(201).json(newRequest);
	} catch (error) {
		console.error("Service Request Creation Error:", error.message);
		res.status(500).json({
			message:
				error.message ||
				"Failed to post Service Request due to server error.",
		});
	}
});

// GET /api/serviceRequests
// Get Service Requests and their Logs
router.get("/", async (req, res) => {
	try {
		const userRole = req.user.role;
		const userId = req.user.id;
		const { carId, status } = req.query;

		const requests = await getServiceRequests({
			userRole,
			userId,
			carId,
			status,
		});

		res.status(200).json({
			message: "Service Requests and Logs retrieved successfully",
			count: requests.length,
			requests: requests,
		});
	} catch (error) {
		console.error("Get Service Requests Error:", error.message);
		res.status(500).json({
			message:
				"Failed to retrieve service requests and logs due to server error.",
		});
	}
});

// GET /api/serviceRequests/issueTypes
// Get Issue Types for Service Requests
router.get("/issueTypes", async (req, res) => {
	try {
		const issueTypes = await getIssueTypes();
		res.status(200).json(issueTypes);
	} catch (error) {
		console.error("Get Issue Types Error:", error.message);
		res.status(500).json({
			message: "Failed to retrieve issue types due to server error.",
		});
	}
});

// PATCH /api/serviceRequests/:id
router.patch("/:id", async (req, res) => {
	try {
		const requestId = req.params.id;
		const { carId, status } = req.body;

		if (!carId || !status) {
			return res.status(400).json({
				message: "Missing required fields: carId and status",
			});
		}

		const updatedRequest = await patchServiceRequest({
			requestId,
			carId,
			status,
		});
		res.status(201).json(updatedRequest);
	} catch (error) {
		console.error("Service Request Update Error:", error);
		res.status(500).json({
			message: "Failed to update Service Request due to server error.",
		});
	}
});

module.exports = router;
