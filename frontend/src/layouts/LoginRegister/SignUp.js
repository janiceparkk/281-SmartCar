// layouts/auth/SignUp.js
import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import BasicLayout from "layouts/authentication/components/BasicLayout";
import bgImage from "assets/images/bg-sign-up-cover.jpeg";
import SocialLoginButtons from "components/SocialLoginButtons";

function SignUp() {
	const [agreement, setAgreement] = useState(false);

	const handleSetAgreement = () => setAgreement(!agreement);

	return (
		<BasicLayout image={bgImage}>
			<Card>
				<MDBox
					variant="gradient"
					bgColor="dark"
					borderRadius="lg"
					coloredShadow="info"
					mx={2}
					mt={-3}
					p={2}
					mb={1}
					textAlign="center"
				>
					<MDTypography
						variant="h4"
						fontWeight="medium"
						color="white"
						mt={1}
					>
						Get Started Now
					</MDTypography>
				</MDBox>
				<MDBox pt={4} pb={3} px={3}>
					<MDBox component="form" role="form">
						<MDBox mb={2}>
							<MDInput type="text" label="Name" fullWidth />
						</MDBox>
						<MDBox mb={2}>
							<MDInput
								type="email"
								label="Email Address"
								fullWidth
							/>
						</MDBox>
						<MDBox mb={2}>
							<MDInput
								type="password"
								label="Password"
								fullWidth
							/>
						</MDBox>
						<MDBox display="flex" alignItems="center" ml={-1}>
							<Checkbox
								checked={agreement}
								onChange={handleSetAgreement}
							/>
							<MDTypography
								variant="button"
								fontWeight="regular"
								color="text"
								sx={{ cursor: "pointer", userSelect: "none" }}
							>
								&nbsp;&nbsp;I agree to receive emails and
								updates
							</MDTypography>
						</MDBox>
						<MDBox mt={4} mb={1}>
							<MDButton
								variant="gradient"
								color="success"
								fullWidth
							>
								Sign Up
							</MDButton>
						</MDBox>
						<SocialLoginButtons />

						<MDBox mt={3} mb={1} textAlign="center">
							<MDTypography variant="button" color="text">
								Already have an account?{" "}
								<MDTypography
									component={Link}
									to="/login"
									variant="button"
									color="info"
									fontWeight="medium"
								>
									Log in
								</MDTypography>
							</MDTypography>
						</MDBox>
					</MDBox>
				</MDBox>
			</Card>
		</BasicLayout>
	);
}

export default SignUp;
