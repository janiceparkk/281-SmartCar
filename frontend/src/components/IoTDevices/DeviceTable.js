import PropTypes from "prop-types";
import { useMemo } from "react";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import DeviceStatusBadge from "./DeviceStatusBadge";
import LiveHeartbeat from "./LiveHeartbeat";

function DeviceTable({ devices, onRowClick }) {
	// Calculate actual device status based on heartbeat timestamp
	// This logic matches the backend SQL in fleetAnalytics.js
	const getActualStatus = (device) => {
		// Maintenance status overrides everything
		if (device.status === "maintenance") return "maintenance";

		// If device is marked as offline in database, it's offline
		if (device.status === "offline") return "offline";

		// Check heartbeat timestamp for devices with status='online'
		if (device.status === "online" && device.last_heartbeat) {
			const lastHeartbeat = new Date(device.last_heartbeat);
			const now = Date.now();
			const oneMinuteAgo = new Date(now - 1 * 60 * 1000);
			const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

			// Online: heartbeat within last 1 minute
			if (lastHeartbeat >= oneMinuteAgo) {
				return "online";
			}

			// Idle: heartbeat between 1-5 minutes ago
			if (lastHeartbeat >= fiveMinutesAgo) {
				return "idle";
			}

			// Offline: heartbeat older than 5 minutes
			return "offline";
		}

		// If status='online' but no heartbeat data, treat as offline
		if (device.status === "online" && !device.last_heartbeat) {
			return "offline";
		}

		// Default for unknown statuses
		return device.status || "unknown";
	};

	const columns = useMemo(
		() => [
			{
				Header: "Device ID",
				accessor: "device_id",
				width: "12%",
				align: "left",
			},
			{ Header: "Type", accessor: "type", width: "15%", align: "left" },
			{ Header: "Car", accessor: "car", width: "18%", align: "left" },
			{
				Header: "Status",
				accessor: "status",
				width: "10%",
				align: "center",
			},
			{
				Header: "Firmware",
				accessor: "firmware",
				width: "15%",
				align: "left",
			},
			{
				Header: "Last Heartbeat",
				accessor: "last_heartbeat",
				width: "20%",
				align: "left",
			},
		],
		[]
	);

	const rows = useMemo(
		() =>
			devices.map((device) => ({
				device_id: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
						sx={{ cursor: "pointer" }}
					>
						{device.device_id}
					</MDTypography>
				),
				type: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{device.device_type || "N/A"}
					</MDTypography>
				),
				car: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{device.car_id
							? `Car ${device.car_id} - ${
									device.car_model || "Unknown"
							  }`
							: "N/A"}
					</MDTypography>
				),
				status: (
					<MDBox display="flex" justifyContent="center">
						<DeviceStatusBadge status={getActualStatus(device)} />
					</MDBox>
				),
				firmware: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="regular"
					>
						{device.firmware_version || "N/A"}
					</MDTypography>
				),
				last_heartbeat: (
					<LiveHeartbeat lastHeartbeat={device.last_heartbeat} />
				),
				onClick: onRowClick ? () => onRowClick(device) : null,
			})),
		[devices, onRowClick]
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

DeviceTable.defaultProps = {
	onRowClick: null,
};

DeviceTable.propTypes = {
	devices: PropTypes.arrayOf(
		PropTypes.shape({
			device_id: PropTypes.string.isRequired,
			device_type: PropTypes.string,
			car_id: PropTypes.string,
			status: PropTypes.string,
			firmware_version: PropTypes.string,
			last_heartbeat: PropTypes.string,
		})
	).isRequired,
	onRowClick: PropTypes.func,
};

export default DeviceTable;
