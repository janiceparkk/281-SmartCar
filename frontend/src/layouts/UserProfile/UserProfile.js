import { useEffect, useState } from "react";
import axios from "axios";
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

const API_URL = process.env.REACT_APP_API_URL;

function UserProfile() {
	const [user, setUser] = useState(null);
	const [cars, setCars] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editMode, setEditMode] = useState(false);
	const [formData, setFormData] = useState({});

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) return console.error("No token found.");

				const { data } = await axios.get(`${API_URL}/user/profile`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				setUser(data.user);
				setCars(data.cars || []);

				const profileData = data.user.profile_data || {};

				setFormData({
					name: data.user.name || "",
					email: data.user.email || "",
					role: data.user.role || "",
					location: profileData.location || "",
					picture: profileData.picture || "",
					emailNotifications:
						profileData.emailNotifications !== undefined
							? profileData.emailNotifications
							: true,
					pushNotifications:
						profileData.pushNotifications !== undefined
							? profileData.pushNotifications
							: true,
					...profileData,
				});
			} catch (err) {
				console.error("Failed to fetch user profile:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, []);

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleToggle = (field) => {
		setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const handleSave = async () => {
		try {
			const token = localStorage.getItem("token");

			// Only put profile-related fields inside profile_data
			const profilePayload = {
				...user.profile_data, // preserve existing data
				location: formData.location,
				picture: formData.picture,
				// add any other fields you want to merge
			};

			const payload = {
				name: formData.name,
				phone: formData.phone,
				company_name: formData.company_name,
				profile_data: profilePayload,
			};

			await axios.put(`${API_URL}/user/profile`, payload, {
				headers: { Authorization: `Bearer ${token}` },
			});

			// Update local user state
			setUser((prev) => ({
				...prev,
				name: formData.name,
				phone: formData.phone,
				company_name: formData.company_name,
				profile_data: profilePayload,
			}));

			alert("Profile updated successfully!");
		} catch (err) {
			console.error("Failed to update profile:", err);
			alert("Failed to update profile.");
		}
	};

	const handleSaveNotifications = async () => {
		try {
			const token = localStorage.getItem("token");

			const profilePayload = {
				...user.profile_data, // preserve existing fields
				emailNotifications: formData.emailNotifications,
				pushNotifications: formData.pushNotifications,
			};

			const payload = { profile_data: profilePayload };

			await axios.put(`${API_URL}/user/profile`, payload, {
				headers: { Authorization: `Bearer ${token}` },
			});

			// Update local user state
			setUser((prev) => ({
				...prev,
				profile_data: profilePayload,
			}));

			alert("Notification settings updated!");
		} catch (err) {
			console.error("Failed to update notifications:", err);
			alert("Failed to update notifications.");
		}
	};




	if (loading) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<MDBox pt={6} pb={3} textAlign="center">
					<MDTypography variant="h6">Loading profile...</MDTypography>
				</MDBox>
			</DashboardLayout>
		);
	}

	if (!user) {
		return (
			<DashboardLayout>
				<DashboardNavbar />
				<MDBox pt={6} pb={3} textAlign="center">
					<MDTypography variant="h6" color="error">
						No user data found. Please log in again.
					</MDTypography>
				</MDBox>
			</DashboardLayout>
		);
	}

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
									<Grid item xs={12}>
										<MDInput
											label="Name"
											name="name"
											value={formData.name}
											onChange={handleChange}
											fullWidth
											disabled={!editMode}
										/>
									</Grid>

									<Grid item xs={12}>
										<MDInput
											label="Email"
											name="email"
											value={formData.email}
											fullWidth
											disabled
										/>
									</Grid>

									<Grid item xs={6}>
										<MDInput
											label="Role"
											name="role"
											value={formData.role}
											fullWidth
											disabled
										/>
									</Grid>

									<Grid item xs={6}>
										<MDInput
											label="Location"
											name="location"
											value={formData.location}
											onChange={handleChange}
											fullWidth
											disabled={!editMode}
										/>
									</Grid>

									{formData.picture && (
										<Grid item xs={12} textAlign="center">
											<img
												src={formData.picture}
												alt="Profile"
												style={{
													width: 100,
													height: 100,
													borderRadius: "50%",
													objectFit: "cover",
												}}
											/>
										</Grid>
									)}
								</Grid>

								<MDBox mt={3} display="flex" gap={2}>
									{editMode ? (
										<>
											<MDButton
												variant="gradient"
												color="success"
												onClick={handleSave}
											>
												Save
											</MDButton>
											<MDButton
												variant="outlined"
												color="secondary"
												onClick={() =>
													setEditMode(false)
												}
											>
												Cancel
											</MDButton>
										</>
									) : (
										<MDButton
											variant="gradient"
											color="info"
											onClick={() => setEditMode(true)}
										>
											Edit Profile
										</MDButton>
									)}
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
									<Switch
										checked={formData.emailNotifications}
										onChange={() =>
											handleToggle("emailNotifications")
										}
									/>
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
									<Switch
										checked={formData.pushNotifications}
										onChange={() =>
											handleToggle("pushNotifications")
										}
									/>
								</MDBox>
								<MDBox mt={2} display="flex" gap={2}>
									<MDButton
										variant="gradient"
										color="success"
										onClick={handleSaveNotifications}
									>
										Save Notifications
									</MDButton>
								</MDBox>
								<Divider />
								<MDBox mt={2}>
									<MDTypography
										variant="button"
										fontWeight="medium"
										mb={1}
									>
										Linked Cars
									</MDTypography>
									{cars.length > 0 ? (
										cars.map((car) => (
											<MDTypography
												key={car.car_id}
												variant="body2"
												color="text"
											>
												• {car.model} ({car.status})
											</MDTypography>
										))
									) : (
										<MDTypography
											variant="body2"
											color="text"
										>
											No cars linked to your profile.
										</MDTypography>
									)}
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
