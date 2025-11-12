import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import BasicLayout from "layouts/authentication/components/BasicLayout";
import bgImage from "assets/images/bg-sign-in-basic.jpeg";
import SocialLoginButtons from "components/SocialLoginButtons";

function Login() {
	const [rememberMe, setRememberMe] = useState(false);

	const handleSetRememberMe = () => setRememberMe(!rememberMe);

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
						Welcome back!
					</MDTypography>
				</MDBox>
				<MDBox pt={4} pb={3} px={3}>
					<MDBox component="form" role="form">
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
								checked={rememberMe}
								onChange={handleSetRememberMe}
							/>
							<MDTypography
								variant="button"
								fontWeight="regular"
								color="text"
								sx={{ cursor: "pointer", userSelect: "none" }}
							>
								&nbsp;&nbsp;Remember me
							</MDTypography>
						</MDBox>
						<MDBox mt={4} mb={1}>
							<MDButton
								variant="gradient"
								color="success"
								fullWidth
							>
								Log In
							</MDButton>
						</MDBox>
						<SocialLoginButtons />
						<MDBox mt={3} mb={1} textAlign="center">
							<MDTypography variant="button" color="text">
								Don&apos;t have an account?{" "}
								<MDTypography
									component={Link}
									to="/signup"
									variant="button"
									color="info"
									fontWeight="medium"
								>
									Sign up
								</MDTypography>
							</MDTypography>
						</MDBox>
					</MDBox>
				</MDBox>
			</Card>
		</BasicLayout>
	);
}

export default Login;
