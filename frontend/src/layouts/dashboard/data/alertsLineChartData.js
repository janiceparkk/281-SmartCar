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

export default function AlertsLineChartData(fetchAlerts) {
	const months = [
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const [alertCounts, setAlertCounts] = useState([]);

	useEffect(() => {
		fetchAlerts().then((res) => {
			const alerts = Array.isArray(res.data) ? res.data : [];
			const counts = new Array(12).fill(0);

			alerts.forEach((a) => {
				const d = new Date(a.createdAt);
				if (isNaN(d)) return;

				const m = d.getMonth();
				if (m >= 0 && m < 12) counts[m]++;
			});

			setAlertCounts(counts);
		});
	}, [fetchAlerts]);

	const alertData = {
		labels: months,
		datasets: {
			label: "Alerts",
			data: alertCounts,
		},
	};

	return alertData;
}
