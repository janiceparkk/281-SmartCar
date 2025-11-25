import { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import CommandStatusBadge from "./CommandStatusBadge";

function CommandHistoryList({ commands }) {
	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	const columns = useMemo(
		() => [
			{
				Header: "Command ID",
				accessor: "command_id",
				width: "15%",
				align: "left",
			},
			{ Header: "Type", accessor: "type", width: "15%", align: "left" },
			{
				Header: "Priority",
				accessor: "priority",
				width: "10%",
				align: "center",
			},
			{
				Header: "Status",
				accessor: "status",
				width: "10%",
				align: "center",
			},
			{
				Header: "Sent At",
				accessor: "sent_at",
				width: "20%",
				align: "left",
			},
			{
				Header: "Completed At",
				accessor: "completed_at",
				width: "20%",
				align: "left",
			},
		],
		[]
	);

	const rows = useMemo(
		() =>
			commands.map((command) => ({
				command_id: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						{command.command_id || "N/A"}
					</MDTypography>
				),
				type: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{command.command_type || "N/A"}
					</MDTypography>
				),
				priority: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{command.priority || "normal"}
					</MDTypography>
				),
				status: (
					<MDBox display="flex" justifyContent="center">
						<CommandStatusBadge status={command.status} />
					</MDBox>
				),
				sent_at: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{formatDate(command.sent_at)}
					</MDTypography>
				),
				completed_at: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{formatDate(command.completed_at)}
					</MDTypography>
				),
			})),
		[commands]
	);

	const tableProps = {
		columns,
		rows,
		isSorted: true,
		entriesPerPage: { defaultValue: 10, entries: [5, 10, 15, 20] },
		showTotalEntries: true,
		noEndBorder: true,
	};

	return <DataTable table={tableProps} />;
}

CommandHistoryList.propTypes = {
	commands: PropTypes.arrayOf(
		PropTypes.shape({
			command_id: PropTypes.string,
			command_type: PropTypes.string,
			priority: PropTypes.string,
			status: PropTypes.string,
			sent_at: PropTypes.string,
			completed_at: PropTypes.string,
		})
	).isRequired,
};

export default CommandHistoryList;
