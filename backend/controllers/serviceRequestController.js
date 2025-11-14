const { pgPool } = require("../config/database");

/**
 * Create a new Service Request
 * @param {Object} data - Service Request data
 * @returns {Object} - Service Request
 */
async function postServiceRequest(data) {
	const { carId, issueId, status, description } = data;

	try {
		const carCheck = await pgPool.query(
			"SELECT car_id FROM smart_cars WHERE car_id = $1",
			[carId]
		);

		if (carCheck.rows.length === 0) {
			throw new Error(`Car with ID ${carId} not found`);
		}

		const result = await pgPool.query(
			`
			WITH new_request AS (
			  INSERT INTO service_requests (car_id, issue_id, status)
			  VALUES ($1, $2, $3)
			  RETURNING request_id, car_id, issue_id, status, created_at
			),
			new_log AS (
			  INSERT INTO service_logs (request_id, description)
			  SELECT request_id, $4
			  FROM new_request
			  RETURNING log_id, request_id, description, timestamp
			)
			SELECT 
			  nr.*, 
			  it.issue_label, 
			  it.issue_priority,
			  nl.log_id, 
			  nl.description AS log_description,
			  nl.timestamp AS log_timestamp
			FROM new_request nr
			JOIN issue_types it ON it.issue_id = nr.issue_id
			JOIN new_log nl ON nl.request_id = nr.request_id;
			`,
			[carId, issueId, status, description || "Service request created."]
		);

		const service_request = result.rows[0];
		console.log(
			`[Service Request Manager] Created new Service Request and Log: ${service_request.request_id} for car: ${carId}`
		);

		return service_request;
	} catch (error) {
		console.error("Error in postServiceRequest:", error.message);
		throw error;
	}
}

/**
 * Get Service Requests
 * @param {Object} params - Query parameters
 * @returns {Array} - List of Service Requests and their Logs
 */
async function getServiceRequests(params) {
	const { userRole, userId, carId, status } = params;

	try {
		let query = `
			SELECT
				sr.*,
				it.issue_label,
				it.issue_priority,
				lg.log_id,
				lg.description AS log_description,
				lg.timestamp   AS log_timestamp
			FROM service_requests sr
			JOIN issue_types it ON it.issue_id = sr.issue_id
			LEFT JOIN LATERAL (
				SELECT sl.log_id, sl.description, sl.timestamp
				FROM service_logs sl
				WHERE sl.request_id = sr.request_id
				ORDER BY sl.timestamp DESC
				LIMIT 1
			) lg ON TRUE
			LEFT JOIN smart_cars c ON sr.car_id = c.car_id
			WHERE 1=1
		`;

		const queryParams = [];
		let i = 1;

		if (userRole === "CarOwner") {
			query += ` AND c.user_id = $${i++}`;
			queryParams.push(userId);
		}
		if (carId) {
			query += ` AND sr.car_id = $${i++}`;
			queryParams.push(Number(carId));
		}
		if (status) {
			query += ` AND sr.status = $${i++}`;
			queryParams.push(status);
		}

		query += `
			ORDER BY
				CASE it.issue_priority
				WHEN 'Critical' THEN 1
				WHEN 'High'     THEN 2
				WHEN 'Medium'   THEN 3
				WHEN 'Low'      THEN 4
				ELSE 5
				END,
				sr.created_at ASC
		`;

		const result = await pgPool.query(query, queryParams);
		console.log(
			`[Service Request Manager] Retrieved ${result.rows.length} requests for ${userRole}`
		);
		return result.rows;
	} catch (error) {
		console.error("Error in getServiceRequests:", error.message);
		throw error;
	}
}

/**
 * Patch Service Request
 * @param {Object} params - Query parameters
 * @returns {Object} - Updated Service Request
 */
async function patchServiceRequest(params) {
	const { requestId, carId, status } = params;
	try {
		const queryParams = [status, requestId, carId];
		const query = `WITH updated AS (
			UPDATE service_requests sr
			   SET status = CAST($1 AS varchar),
				   	resolved_at = CASE
						WHEN CAST($1 AS varchar) = 'Resolved' THEN NOW()
					 	WHEN CAST($1 AS varchar) = 'In Progress' THEN NULL
					 	ELSE sr.resolved_at
				   	END
			 	WHERE sr.request_id = $2
			   	AND sr.car_id     = $3
			RETURNING sr.*
		  )
		  SELECT u.*,
				 it.issue_label,
				 it.issue_priority,
				 lg.log_id,
				 lg.description AS log_description,
				 lg.timestamp   AS log_timestamp
			FROM updated u
			JOIN issue_types it
			  ON it.issue_id = u.issue_id
			LEFT JOIN LATERAL (
				  SELECT sl.log_id, sl.description, sl.timestamp
					FROM service_logs sl
				   WHERE sl.request_id = u.request_id
				   ORDER BY sl.timestamp DESC
				   LIMIT 1
			) lg ON TRUE`;

		const result = await pgPool.query(query, queryParams);
		console.log(
			`[Service Request Manager] Updated Service Request and Log: ${requestId} for car: ${carId}`
		);
		return result.rows[0];
	} catch (error) {
		console.error("Error in patchServiceRequest:", error.message);
		throw error;
	}
}

module.exports = {
	getServiceRequests,
	postServiceRequest,
	patchServiceRequest,
};
