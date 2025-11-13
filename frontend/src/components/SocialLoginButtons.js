import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import { useContext } from "react";
import { AuthContext } from "context/AuthContext";

const googleLogo = "https://developers.google.com/identity/images/g-logo.png";
const appleLogo =
	"https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg";

function SocialLoginButtons() {
	const { login } = useContext(AuthContext);

	const handleGoogleLogin = () => {
		// Redirect in the same window
		window.location.href = `${
			process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"
		}/auth/google`;
	};

	const handleAppleLogin = () => {
		// Placeholder: implement Apple OAuth flow similarly
		alert("Apple login not implemented yet");
	};

	return (
		<MDBox mt={3}>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<MDButton
						variant="outlined"
						color="dark"
						fullWidth
						sx={{
							borderRadius: "8px",
							textTransform: "none",
							fontWeight: "medium",
							py: 1,
							borderColor: "#dadce0",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 1,
							backgroundColor: "#fff",
						}}
						onClick={handleGoogleLogin}
					>
						<img
							src={googleLogo}
							alt="Google"
							width="18"
							height="18"
						/>
						Sign in with Google
					</MDButton>
				</Grid>

				<Grid item xs={12} md={6}>
					<MDButton
						variant="outlined"
						color="dark"
						fullWidth
						sx={{
							borderRadius: "8px",
							textTransform: "none",
							fontWeight: "medium",
							py: 1,
							borderColor: "#dadce0",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 1,
							backgroundColor: "#fff",
						}}
						onClick={handleAppleLogin}
					>
						<img
							src={appleLogo}
							alt="Apple"
							width="18"
							height="18"
						/>
						Sign in with Apple
					</MDButton>
				</Grid>
			</Grid>
		</MDBox>
	);
}

export default SocialLoginButtons;
