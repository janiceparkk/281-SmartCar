import axios from "axios";
import { useState } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

export default function LogDetails() {
	const location = useLocation();
	const [log, setLog] = useState(location.state?.log);
	const [resolving, setResolving] = useState(false);

	const handleResolve = async () => {
		if (!log) return;
		try {
			setResolving(true);
			const token = localStorage.getItem("token");
			const updatedStatus =
				log.status === "In Progress" ? "Resolved" : "In Progress";
			const updatedLog = await axios.patch(
				`${process.env.REACT_APP_API_URL}/serviceRequests/${log.request_id}`,
				{ carId: log.car_id, status: updatedStatus },
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			if (updatedLog) {
				setLog((prev) => ({ ...prev, ...updatedLog.data }));
			}
			alert("Updated Service Request Status");
		} catch (error) {
			console.error("Failed to update status:", error);
			alert("Error resolving service request.");
		} finally {
			setResolving(false);
		}
	};

	if (!log) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<Card>
					<MDBox p={3}>
						<MDTypography color="error">
							No log data passed. Try returning to the Dashboard.
						</MDTypography>
						<MDButton
							component={RouterLink}
							to="/dashboard"
							variant="outlined"
							color="info"
							size="small"
						>
							Back to Dashboard
						</MDButton>
					</MDBox>
				</Card>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<DashboardNavbar />
			<Card>
				<MDBox p={3}>
					<MDTypography variant="h6" fontWeight="medium">
						Log Details
					</MDTypography>

					<MDBox lineHeight={2} mt={2}>
						<MDTypography variant="button">
							Log ID: {log.log_id}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Request ID: {log.request_id}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Car ID: {log.car_id}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Issue: {log.issue_label}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Priority: {log.issue_priority}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Status: {log.status}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Timestamp:{" "}
							{log.log_timestamp
								? new Date(log.log_timestamp).toLocaleString()
								: "—"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Description: {log.log_description}
						</MDTypography>
					</MDBox>
					{log.status === "In Progress" ? (
						<MDButton
							variant="outlined"
							size="medium"
							color="info"
							sx={{
								textTransform: "none",
								borderRadius: "1rem",
								minWidth: "auto",
								px: 3,
								mt: 1.5,
							}}
							onClick={handleResolve}
							disabled={resolving}
						>
							{resolving
								? "Resolving..."
								: "Resolve Service Request"}
						</MDButton>
					) : (
						<MDButton
							variant="outlined"
							size="medium"
							color="secondary"
							sx={{
								textTransform: "none",
								borderRadius: "1rem",
								minWidth: "auto",
								px: 3,
								mt: 1.5,
							}}
							onClick={handleResolve}
							disabled={resolving}
						>
							{resolving
								? "Reopening..."
								: "Reopen Service Request"}
						</MDButton>
					)}
				</MDBox>
			</Card>
		</DashboardLayout>
	);
}
