import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import MDTypography from "components/MDTypography";

export default function useServiceLogs() {
	const [serviceLogs, setServiceLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					setLoading(false);
					setServiceLogs([]);
					return;
				}

				const res = await axios.get(
					"http://localhost:5000/api/serviceRequests",
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				);

				const list = Array.isArray(res.data)
					? res.data
					: res.data?.requests || [];
				if (alive) setServiceLogs(res.data.requests || []);
			} catch (e) {
				if (alive) setError(e);
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	const columns = [
		{ Header: "Log ID", accessor: "logId" },
		{ Header: "Request ID", accessor: "requestId" },
		{ Header: "Car ID", accessor: "carID" },
		{ Header: "Issue Type", accessor: "issueType" },
		{ Header: "Priority", accessor: "priority" },
		{ Header: "Status", accessor: "status" },
		{ Header: "Time Stamp", accessor: "timeStamp" },
	];

	const rows = serviceLogs
		? serviceLogs.map((log) => ({
				logId: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							color="text"
							fontWeight="medium"
							sx={{ cursor: "pointer" }}
						>
							{log.log_id}
						</MDTypography>
					</Link>
				),
				requestId: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							color="text"
							fontWeight="medium"
							sx={{ cursor: "pointer" }}
						>
							{log.request_id}
						</MDTypography>
					</Link>
				),
				carID: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							color="text"
							fontWeight="medium"
							sx={{ cursor: "pointer" }}
						>
							{log.car_id}
						</MDTypography>
					</Link>
				),
				issueType: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							color="text"
							fontWeight="medium"
							sx={{ cursor: "pointer" }}
						>
							{log.issue_label}
						</MDTypography>
					</Link>
				),
				priority: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							color="text"
							fontWeight="medium"
							sx={{ cursor: "pointer" }}
						>
							{log.issue_priority}
						</MDTypography>
					</Link>
				),
				status: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							fontWeight="medium"
							color={
								log.status === "Resolved"
									? "success"
									: log.status === "In Progress"
									? "info"
									: "error"
							}
							sx={{ cursor: "pointer" }}
						>
							{log.status}
						</MDTypography>
					</Link>
				),
				timeStamp: (
					<Link
						to={`/logs/${encodeURIComponent(log.log_id)}`}
						state={{ log }}
						style={{ textDecoration: "none" }}
					>
						<MDTypography
							variant="caption"
							color="text"
							fontWeight="medium"
							sx={{ cursor: "pointer" }}
						>
							{log.log_timestamp
								? new Date(log.log_timestamp).toLocaleString()
								: "—"}
						</MDTypography>
					</Link>
				),
		  }))
		: [];

	return { columns, rows, loading, error };
}
