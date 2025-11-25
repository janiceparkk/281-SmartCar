import axios from "axios";
import { useState } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

export default function AlertDetails() {
	const location = useLocation();
	const [alertItem, setAlertItem] = useState(location.state?.alert);
	const [resolving, setResolving] = useState(false);

	const handleResolve = async () => {
		if (!alertItem) return;
		try {
			setResolving(true);
			const token = localStorage.getItem("token");
			const updatedStatus =
				alertItem.status === "Active" ||
				alertItem.status === "Acknowledged"
					? "Resolved"
					: "Acknowledged";
			const reqParam = updatedStatus === "Resolved" ? "close" : "ack";

			const updatedAlert = await axios.post(
				`${process.env.REACT_APP_API_URL}/alerts/${alertItem.alert_id}/${reqParam}`,
				null,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			if (updatedAlert) {
				setAlertItem((prev) => ({ ...prev, ...updatedAlert.data }));
			}
			alert("Updated Alert Status");
		} catch (error) {
			console.error("Failed to update status:", error);
			alert("Error resolving alert.");
		} finally {
			setResolving(false);
		}
	};

	if (!alertItem) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<Card>
					<MDBox p={3}>
						<MDTypography color="error">
							No alert data passed. Try returning to the
							Dashboard.
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
						Alert Details
					</MDTypography>

					<MDBox lineHeight={2} mt={2}>
						<MDTypography variant="button">
							Alert ID: {alertItem.alert_id}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Car ID: {alertItem.car_id}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Alert Type: {alertItem.alert_type}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Sound Classification:{" "}
							{alertItem?.sound_classification ?? "Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Confidence Score: {alertItem.confidence_score}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Status: {alertItem.status}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Audio Duration:{" "}
							{alertItem?.audio_context?.duration ??
								"Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Audio Decibel Level:{" "}
							{alertItem?.audio_context?.decibel_level ??
								"Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Audio frequency_range:{" "}
							{alertItem?.audio_context?.frequency_range ??
								"Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Latitude:{" "}
							{alertItem?.location?.latitude ?? "Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Longitude:{" "}
							{alertItem?.location?.longitude ?? "Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Location Accuracy:{" "}
							{alertItem?.location?.accuracy ?? "Not Available"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Assigned to:{" "}
							{alertItem?.assigned_to ?? "Unassigned"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Resolved at:{" "}
							{alertItem?.resolved_at ?? "Unresolved"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Timestamp:{" "}
							{alertItem?.audio_context?.timestamp
								? new Date(
										alertItem.audio_context.timestamp
								  ).toLocaleString()
								: "—"}
						</MDTypography>
						<br />
						<MDTypography variant="button">
							Resolution Notes:{" "}
							{alertItem?.resolution_notes ?? "Not Available"}
						</MDTypography>
					</MDBox>
					{alertItem.status === "Active" ||
					alertItem.status === "Acknowledged" ? (
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
							{resolving ? "Resolving..." : "Resolve Alert"}
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
							{resolving ? "Reopening..." : "Reopen Alert"}
						</MDButton>
					)}
				</MDBox>
			</Card>
		</DashboardLayout>
	);
}
