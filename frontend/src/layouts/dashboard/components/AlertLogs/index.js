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

import { useState } from "react";

// @mui material components
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React examples
import DataTable from "examples/Tables/DataTable";

// Data
import data from "layouts/dashboard/components/AlertLogs/data";

function AlertLogs() {
	const { columns, rows } = data();

	return (
		<Card>
			<MDBox
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				p={3}
			>
				<MDBox>
					<MDTypography variant="h6" gutterBottom>
						Alert Overview
					</MDTypography>
				</MDBox>
			</MDBox>
			<MDBox>
				<DataTable
					table={{ columns, rows }}
					showTotalEntries={false}
					isSorted={false}
					noEndBorder
					entriesPerPage={false}
				/>
			</MDBox>
		</Card>
	);
}

export default AlertLogs;
