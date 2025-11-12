import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";

const googleLogo = "https://developers.google.com/identity/images/g-logo.png";
const appleLogo =
	"https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg";

function SocialLoginButtons() {
	return (
		<MDBox mt={3}>
			<Grid container spacing={2}>
				{/* Google Sign-in */}
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

				{/* Apple Sign-in */}
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
