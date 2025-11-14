import { useLocation, Link as RouterLink } from "react-router-dom";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

export default function LogDetails() {
	const location = useLocation();
	const log = location.state?.log;

	console.log(log);

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
				</MDBox>
			</Card>
		</DashboardLayout>
	);
}
