import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDInput from "components/MDInput";

function UserProfile() {
	return (
		<DashboardLayout>
			<DashboardNavbar />
			<MDBox pt={6} pb={3}>
				<Grid container spacing={3}>
					{/* Left - User Info */}
					<Grid item xs={12} md={6}>
						<Card>
							<MDBox p={3}>
								<MDTypography
									variant="h6"
									fontWeight="medium"
									mb={2}
								>
									User Profile
								</MDTypography>
								<Grid container spacing={2}>
									<Grid item xs={6}>
										<MDInput
											label="First Name"
											defaultValue="Jain"
											fullWidth
										/>
									</Grid>
									<Grid item xs={6}>
										<MDInput
											label="Last Name"
											defaultValue="Doe"
											fullWidth
										/>
									</Grid>
									<Grid item xs={12}>
										<MDInput
											label="Email Address"
											defaultValue="jain.doe@company.com"
											fullWidth
										/>
									</Grid>
									<Grid item xs={12}>
										<MDInput
											label="Phone Number"
											defaultValue="+1 833-123-4567"
											fullWidth
										/>
									</Grid>
									<Grid item xs={6}>
										<MDInput
											label="Role"
											defaultValue="Fleet Manager"
											fullWidth
										/>
									</Grid>
									<Grid item xs={6}>
										<MDInput
											label="Department"
											defaultValue="Operations"
											fullWidth
										/>
									</Grid>
									<Grid item xs={12}>
										<MDInput
											label="Location"
											defaultValue="San Francisco, CA"
											fullWidth
										/>
									</Grid>
								</Grid>
								<MDBox mt={3}>
									<MDButton variant="gradient" color="info">
										Edit Profile
									</MDButton>
								</MDBox>
							</MDBox>
						</Card>
					</Grid>

					{/* Right - Notifications */}
					<Grid item xs={12} md={6}>
						<Card>
							<MDBox p={3}>
								<MDTypography
									variant="h6"
									fontWeight="medium"
									mb={2}
								>
									Notifications
								</MDTypography>
								<MDBox
									display="flex"
									justifyContent="space-between"
									alignItems="center"
									mb={1}
								>
									<MDTypography variant="button">
										Email Notifications
									</MDTypography>
									<Switch defaultChecked />
								</MDBox>
								<MDBox
									display="flex"
									justifyContent="space-between"
									alignItems="center"
									mb={1}
								>
									<MDTypography variant="button">
										Push Notifications
									</MDTypography>
									<Switch defaultChecked />
								</MDBox>
								<Divider />
								<MDBox mt={2}>
									<MDTypography
										variant="button"
										fontWeight="medium"
										mb={1}
									>
										Recent Alerts
									</MDTypography>
									<MDTypography variant="body2" color="text">
										• Service Request Approved • IT Driver
										Offer • Car Update Notice • Payment
										Processed
									</MDTypography>
								</MDBox>
							</MDBox>
						</Card>
					</Grid>
				</Grid>
			</MDBox>
		</DashboardLayout>
	);
}

export default UserProfile;
