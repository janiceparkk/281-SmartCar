/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState } from "react";
// @mui material components
import Grid from "@mui/material/Grid";
import TimeToLeaveIcon from "@mui/icons-material/TimeToLeave";
import FeedbackIcon from "@mui/icons-material/Feedback";
import CampaignIcon from "@mui/icons-material/Campaign";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import ReportsBarChart from "examples/Charts/BarCharts/ReportsBarChart";
import ReportsLineChart from "examples/Charts/LineCharts/ReportsLineChart";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

// Data
import AudioBarChartData from "./data/audioBarChartData";
import AlertsLineChartData from "./data/alertsLineChartData";

// Dashboard components
import AlertLogs from "layouts/dashboard/components/AlertLogs";
import ServiceLogs from "./components/ServiceLogs";

function Dashboard(props) {
	const {
		fetchActiveCars,
		fetchAlerts,
		fetchActiveAlerts,
		fetchActiveRequests,
		fetchActiveDevices,
	} = props;

	const [activeCars, setActiveCars] = useState(0);
	const [activeAlerts, setActiveAlerts] = useState(0);
	const [activeRequests, setActiveRequests] = useState(0);
	const [activeDevices, setActiveDevices] = useState(0);

	useEffect(() => {
		fetchActiveCars().then((result) => {
			setActiveCars(result.data.length);
		});
		fetchActiveAlerts().then((result) => {
			setActiveAlerts(result.data.length);
		});
		fetchActiveRequests().then((result) => {
			setActiveRequests(result.data.count);
		});
		fetchActiveDevices().then((result) => {
			setActiveDevices(result.data.count);
		});
	}, []);

	return (
		<DashboardLayout>
			<DashboardNavbar />
			<MDBox py={3}>
				<Grid container spacing={3}>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox mb={1.5}>
							<ComplexStatisticsCard
								color="dark"
								icon={<TimeToLeaveIcon />}
								title="Cars Online"
								count={activeCars}
								percentage={{
									color: "success",
									label: "Just updated",
								}}
							/>
						</MDBox>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox mb={1.5}>
							<ComplexStatisticsCard
								icon={<CampaignIcon />}
								title="Active Alerts"
								count={activeAlerts}
								percentage={{
									color: "success",
									label: "Just updated",
								}}
							/>
						</MDBox>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox mb={1.5}>
							<ComplexStatisticsCard
								color="success"
								icon={<FeedbackIcon />}
								title="Active Service Requests"
								count={activeRequests}
								percentage={{
									color: "success",
									label: "Just updated",
								}}
							/>
						</MDBox>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<MDBox mb={1.5}>
							<ComplexStatisticsCard
								color="primary"
								icon={<PhoneAndroidIcon />}
								title="Devices Online"
								count={activeDevices}
								percentage={{
									color: "success",
									label: "Just updated",
								}}
							/>
						</MDBox>
					</Grid>
				</Grid>
				<MDBox mt={4.5}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={6} lg={6}>
							<MDBox mb={3}>
								<ReportsBarChart
									color="info"
									title="Audio Event Counts"
									description="This Year"
									date="Just updated"
									chart={AudioBarChartData(fetchAlerts)}
								/>
							</MDBox>
						</Grid>
						<Grid item xs={12} md={6} lg={6}>
							<MDBox mb={3}>
								<ReportsLineChart
									color="dark"
									title="Alert Detection"
									description="Per Month"
									date="Just updated"
									chart={AlertsLineChartData(fetchAlerts)}
								/>
							</MDBox>
						</Grid>
					</Grid>
				</MDBox>
				<MDBox>
					<ServiceLogs />
				</MDBox>
				<MDBox mt={3}>
					<AlertLogs />
				</MDBox>
			</MDBox>
		</DashboardLayout>
	);
}

export default Dashboard;
