import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import BasicLayout from "layouts/authentication/components/BasicLayout";
import bgImage from "assets/images/bg-sign-up-cover.jpeg";
import SocialLoginButtons from "components/SocialLoginButtons";
import { registerUser } from "services/authService";

function SignUp() {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
	});
	const [agreement, setAgreement] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSetAgreement = () => setAgreement(!agreement);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!agreement) {
			setError("You must agree to receive emails and updates.");
			return;
		}
		setError("");
		setLoading(true);

		try {
			const result = await registerUser(formData);
			console.log("Registration successful:", result);
			// Redirect to login page after successful signup
			window.location.href = "/login";
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

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
					<MDBox component="form" role="form" onSubmit={handleSubmit}>
						<MDBox mb={2}>
							<MDInput
								type="text"
								label="Name"
								name="name"
								fullWidth
								value={formData.name}
								onChange={handleChange}
							/>
						</MDBox>
						<MDBox mb={2}>
							<MDInput
								type="email"
								label="Email Address"
								name="email"
								fullWidth
								value={formData.email}
								onChange={handleChange}
							/>
						</MDBox>
						<MDBox mb={2}>
							<MDInput
								type="password"
								label="Password"
								name="password"
								fullWidth
								value={formData.password}
								onChange={handleChange}
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

						{error && (
							<MDTypography color="error" variant="body2" mt={1}>
								{error}
							</MDTypography>
						)}

						<MDBox mt={4} mb={1}>
							<MDButton
								variant="gradient"
								color="success"
								fullWidth
								type="submit"
								disabled={loading}
							>
								{loading ? "Signing Up..." : "Sign Up"}
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
