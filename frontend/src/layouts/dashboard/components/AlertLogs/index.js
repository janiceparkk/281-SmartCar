import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DataTable from "examples/Tables/DataTable";
import useAlertLogsData from "./data";

export default function AlertLogs() {
	const { alerts, loading, error } = useAlertLogsData();
	const [statusFilter, setStatusFilter] = useState("All");
	const [typeFilter, setTypeFilter] = useState("All");
	const [carIdFilter, setCarIdFilter] = useState("All");

	const [sortBy, setSortBy] = useState("timestamp");
	const [sortDir, setSortDir] = useState("desc");

	const toggleSort = (key) => {
		if (sortBy !== key) {
			setSortBy(key);
			setSortDir("desc");
		} else {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		}
	};

	const SortHeader = ({ label, active, dir, onClick }) => (
		<MDTypography
			variant="caption"
			fontWeight="bold"
			sx={{ cursor: "pointer", userSelect: "none" }}
			onClick={onClick}
			title="Click to sort"
		>
			{label} {active ? (dir === "asc" ? "▲" : "▼") : ""}
		</MDTypography>
	);

	const alertTypes = useMemo(() => {
		const set = new Set(alerts.map((a) => a.alert_type).filter(Boolean));
		return ["All", ...Array.from(set)];
	}, [alerts]);

	const statuses = useMemo(() => {
		const set = new Set(alerts.map((a) => a.status).filter(Boolean));
		return ["All", ...Array.from(set)];
	}, [alerts]);

	const carIds = useMemo(() => {
		const set = new Set(alerts.map((a) => a.car_id).filter(Boolean));
		return ["All", ...Array.from(set)];
	}, [alerts]);

	const filtered = useMemo(() => {
		return alerts.filter((a) => {
			const okStatus =
				statusFilter === "All" || a.status === statusFilter;
			const okType = typeFilter === "All" || a.alert_type === typeFilter;
			const okCar =
				carIdFilter === "All" ||
				String(a.car_id) === String(carIdFilter);
			return okStatus && okType && okCar;
		});
	}, [alerts, statusFilter, typeFilter, carIdFilter]);

	const sorted = useMemo(() => {
		const arr = [...filtered];
		const cmpStr = (a, b) =>
			a.localeCompare(b, undefined, { sensitivity: "base" });

		arr.sort((a, b) => {
			if (sortBy === "timestamp") {
				const ta = a?.audio_context?.timestamp
					? new Date(a.audio_context.timestamp).getTime()
					: 0;
				const tb = b?.audio_context?.timestamp
					? new Date(b.audio_context.timestamp).getTime()
					: 0;
				return sortDir === "asc" ? ta - tb : tb - ta;
			}
			if (sortBy === "carId") {
				const ca = String(a?.car_id ?? "");
				const cb = String(b?.car_id ?? "");
				return sortDir === "asc" ? cmpStr(ca, cb) : cmpStr(cb, ca);
			}
			return 0;
		});
		return arr;
	}, [filtered, sortBy, sortDir]);

	const columns = [
		{ Header: "Alert ID", accessor: "alertId" },
		{
			Header: "Car ID",
			accessor: "carID",
		},
		{ Header: "Alert Type", accessor: "alertType" },
		{ Header: "Status", accessor: "status" },
		{
			Header: (
				<SortHeader
					label="Time Stamp"
					active={sortBy === "timestamp"}
					dir={sortDir}
					onClick={() => toggleSort("timestamp")}
				/>
			),
			accessor: "timeStamp",
		},
	];

	const rows = sorted.map((log) => ({
		alertId: (
			<Link
				to={`/alerts/${encodeURIComponent(log.alert_id)}`}
				state={{ alert: log }}
				style={{ textDecoration: "none" }}
			>
				<MDTypography
					variant="caption"
					color="text"
					fontWeight="medium"
					sx={{ cursor: "pointer" }}
				>
					{log.alert_id}
				</MDTypography>
			</Link>
		),
		carID: (
			<Link
				to={`/alerts/${encodeURIComponent(log.alert_id)}`}
				state={{ alert: log }}
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
		alertType: (
			<MDButton
				variant="outlined"
				size="small"
				color="secondary"
				sx={{
					textTransform: "none",
					cursor: "default",
					pointerEvents: "none",
					borderRadius: "1rem",
					minWidth: "auto",
					px: 1.5,
				}}
			>
				{log.alert_type ?? "—"}
			</MDButton>
		),
		status: (
			<MDButton
				variant="outlined"
				size="small"
				color={
					log.status === "Resolved"
						? "success"
						: log.status === "Acknowledged" ||
						  log.status === "False Positive"
						? "info"
						: "error"
				}
				sx={{
					textTransform: "none",
					cursor: "default",
					pointerEvents: "none",
					borderRadius: "1rem",
					minWidth: "auto",
					px: 1.5,
				}}
			>
				{log.status ?? "—"}
			</MDButton>
		),
		timeStamp: (
			<Link
				to={`/alerts/${encodeURIComponent(log.alert_id)}`}
				state={{ alert: log }}
				style={{ textDecoration: "none" }}
			>
				<MDTypography
					variant="caption"
					color="text"
					fontWeight="medium"
					sx={{ cursor: "pointer" }}
				>
					{log?.audio_context?.timestamp
						? new Date(log.audio_context.timestamp).toLocaleString()
						: "—"}
				</MDTypography>
			</Link>
		),
	}));

	if (error)
		return (
			<MDTypography color="error">Failed to load alerts.</MDTypography>
		);

	return (
		<Card>
			<MDBox pt={3} px={3}>
				<MDTypography variant="h6" fontWeight="medium">
					Alerts
				</MDTypography>
			</MDBox>
			<MDBox mt={3} px={3} pb={1}>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={3}>
						<TextField
							fullWidth
							select
							label="Car ID"
							size="small"
							value={carIdFilter}
							onChange={(e) => setCarIdFilter(e.target.value)}
						>
							{carIds.map((s) => (
								<MenuItem key={s} value={s}>
									{s}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<TextField
							fullWidth
							select
							label="Alert Type"
							size="small"
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
						>
							{alertTypes.map((t) => (
								<MenuItem key={t} value={t}>
									{t}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<TextField
							fullWidth
							select
							label="Status"
							size="small"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							{statuses.map((s) => (
								<MenuItem key={s} value={s}>
									{s}
								</MenuItem>
							))}
						</TextField>
					</Grid>
				</Grid>
			</MDBox>
			<MDBox mb={1}>
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
