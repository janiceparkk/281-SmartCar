import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DataTable from "examples/Tables/DataTable";
import useServiceLogs from "./data";

export default function ServiceLogs() {
	const { columns, rows, loading, error } = useServiceLogs();

	if (error) {
		return (
			<MDTypography color="error">
				Failed to load service logs.
			</MDTypography>
		);
	}

	return (
		<Card>
			<MDBox pt={3} px={3}>
				<MDTypography variant="h6" fontWeight="medium">
					Service Logs
				</MDTypography>
			</MDBox>

			<MDBox p={3}>
				{loading ? (
					<MDTypography variant="button" color="text">
						Loading…
					</MDTypography>
				) : (
					<DataTable
						table={{ columns, rows }}
						isSorted={false}
						entriesPerPage={false}
						showTotalEntries={false}
						noEndBorder
					/>
				)}
			</MDBox>
		</Card>
	);
}
