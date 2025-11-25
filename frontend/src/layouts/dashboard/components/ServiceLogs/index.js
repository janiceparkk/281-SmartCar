// ServiceLogs.jsx
import { useMemo, useState } from "react";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DataTable from "examples/Tables/DataTable";
import MDButton from "components/MDButton";
import { Link } from "react-router-dom";

import useServiceLogsData from "./data";

const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export default function ServiceLogs() {
	const { serviceLogs, loading, error } = useServiceLogsData();

	const [statusFilter, setStatusFilter] = useState("All");
	const [issueTypeFilter, setIssueTypeFilter] = useState("All");
	const [carIdFilter, setCarIdFilter] = useState("All");

	const [sortBy, setSortBy] = useState(null);
	const [sortDir, setSortDir] = useState("desc");

	const issueTypes = useMemo(() => {
		const set = new Set(
			serviceLogs.map((l) => l.issue_label).filter(Boolean)
		);
		return ["All", ...Array.from(set)];
	}, [serviceLogs]);

	const carIds = useMemo(() => {
		const set = new Set(serviceLogs.map((l) => l.car_id).filter(Boolean));
		return ["All", ...Array.from(set)];
	}, [serviceLogs]);

	const filtered = useMemo(() => {
		return serviceLogs.filter((l) => {
			const okStatus =
				statusFilter === "All" || l.status === statusFilter;
			const okIssue =
				issueTypeFilter === "All" || l.issue_label === issueTypeFilter;
			const okCar =
				carIdFilter === "All" ||
				String(l.car_id) === String(carIdFilter);
			return okStatus && okIssue && okCar;
		});
	}, [serviceLogs, statusFilter, issueTypeFilter, carIdFilter]);

	const sorted = useMemo(() => {
		const arr = [...filtered];
		if (!sortBy) return arr;

		if (sortBy === "priority") {
			arr.sort((a, b) => {
				const ra = PRIORITY_RANK[a.issue_priority] ?? 0;
				const rb = PRIORITY_RANK[b.issue_priority] ?? 0;
				return sortDir === "asc" ? ra - rb : rb - ra;
			});
		} else if (sortBy === "timestamp") {
			arr.sort((a, b) => {
				const ta = a.log_timestamp
					? new Date(a.log_timestamp).getTime()
					: 0;
				const tb = b.log_timestamp
					? new Date(b.log_timestamp).getTime()
					: 0;
				return sortDir === "asc" ? ta - tb : tb - ta;
			});
		}
		return arr;
	}, [filtered, sortBy, sortDir]);

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

	const toggleSort = (key) => {
		if (sortBy !== key) {
			setSortBy(key);
			setSortDir("desc");
		} else {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		}
	};

	const columns = [
		{ Header: "Log ID", accessor: "logId" },
		{ Header: "Request ID", accessor: "requestId" },
		{ Header: "Car ID", accessor: "carID" },
		{ Header: "Issue Type", accessor: "issueType" },
		{
			Header: (
				<SortHeader
					label="Priority"
					active={sortBy === "priority"}
					dir={sortDir}
					onClick={() => toggleSort("priority")}
				/>
			),
			accessor: "priority",
		},
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
				{log.issue_label}
			</MDButton>
		),
		priority: (
			<MDButton
				variant="contained"
				size="small"
				color={
					log.issue_priority === "Critical"
						? "error"
						: log.issue_priority === "High"
						? "warning"
						: log.issue_priority === "Medium"
						? "info"
						: "success"
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
				{log.issue_priority}
			</MDButton>
		),
		status: (
			<MDButton
				variant="outlined"
				size="small"
				color={
					log.status === "Resolved"
						? "success"
						: log.status === "In Progress"
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
				{log.status}
			</MDButton>
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
	}));

	if (error)
		return (
			<MDTypography color="error">
				Failed to load service logs.
			</MDTypography>
		);

	return (
		<Card>
			<MDBox pt={3} px={3}>
				<MDTypography variant="h6" fontWeight="medium">
					Service Logs
				</MDTypography>
			</MDBox>
			<MDBox mt={3} px={3} pb={1}>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={4} md={3}>
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
					<Grid item xs={12} sm={4} md={3}>
						<TextField
							fullWidth
							select
							label="Issue Type"
							size="small"
							value={issueTypeFilter}
							onChange={(e) => setIssueTypeFilter(e.target.value)}
						>
							{issueTypes.map((s) => (
								<MenuItem key={s} value={s}>
									{s}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={12} sm={4} md={3}>
						<TextField
							fullWidth
							select
							label="Status"
							size="small"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							{["All", "In Progress", "Resolved"].map((s) => (
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
