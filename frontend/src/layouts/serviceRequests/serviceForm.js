import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDInput from "components/MDInput";

export default function ServiceForm() {
	const navigate = useNavigate();

	const [cars, setCars] = useState([]);
	const [issueTypes, setIssueTypes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		carId: "",
		issueId: "",
		description: "",
	});

	const [errors, setErrors] = useState({
		carId: "",
		issueId: "",
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
	};

	const validate = () => {
		const next = { carId: "", issueId: "" };
		if (!formData.carId) next.carId = "Car ID is required.";
		if (!formData.issueId) next.issueId = "Issue Type is required.";
		setErrors(next);
		return !next.carId && !next.issueId;
	};

	const handleBlur = (e) => {
		const { name } = e.target;
		if (name === "carId" && !formData.carId) {
			setErrors((p) => ({ ...p, carId: "Car ID is required." }));
		}
		if (name === "issueId" && !formData.issueId) {
			setErrors((p) => ({ ...p, issueId: "Issue Type is required." }));
		}
	};

	async function fetchUserCars() {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get("http://localhost:5000/api/cars", {
				headers: { Authorization: `Bearer ${token}` },
			});
			return res;
		} catch {
			return false;
		}
	}

	async function fetchIssueTypes() {
		try {
			const token = localStorage.getItem("token");
			const res = await axios.get(
				"http://localhost:5000/api/serviceRequests/issueTypes",
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);
			return res;
		} catch {
			return false;
		}
	}

	useEffect(() => {
		fetchUserCars().then((result) => result && setCars(result.data || []));
		fetchIssueTypes().then(
			(result) => result && setIssueTypes(result.data || [])
		);
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			await axios.post(
				`http://localhost:5000/api/serviceRequests`,
				formData,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			navigate("/user/profile");
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<DashboardLayout>
			<DashboardNavbar />
			<MDBox pt={3} pb={3}>
				<Grid container spacing={3} justifyContent="center">
					<Grid item xs={12} md={10} lg={9}>
						<Card
							sx={{
								p: 4,
								width: "100%",
								maxWidth: 1000,
								mx: "auto",
							}}
						>
							<MDBox
								component="form"
								role="form"
								onSubmit={handleSubmit}
							>
								<MDTypography
									variant="h6"
									fontWeight="medium"
									mb={1}
								>
									Service Request Form
								</MDTypography>
								<MDTypography
									variant="body2"
									fontWeight="regular"
									color="text"
									mb={3}
								>
									Need assistance with your car, device, or
									our app? Please fill out this form and we
									will contact you shortly.
								</MDTypography>
								<MDBox mb={2}>
									<MDInput
										fullWidth
										select
										required
										label="Car ID"
										name="carId"
										value={formData.carId}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(errors.carId)}
										helperText={errors.carId}
										SelectProps={{
											displayEmpty: true,
											IconComponent: ArrowDropDownIcon,
										}}
										InputLabelProps={{ shrink: true }}
										sx={{
											"& .MuiInputBase-root": {
												height: 56,
											},
											"& .MuiInputBase-input": {
												py: 1.25,
											},
											"& .MuiInputLabel-asterisk": {
												color: (t) =>
													t.palette.error.main,
											},
										}}
									>
										<MenuItem value="" disabled>
											Select a car
										</MenuItem>
										{cars.map((c) => (
											<MenuItem
												key={c.car_id}
												value={c.car_id}
											>
												Car {c.car_id}: {c.model}
											</MenuItem>
										))}
									</MDInput>
								</MDBox>
								<MDBox mb={2}>
									<MDInput
										fullWidth
										select
										required
										label="Issue Type"
										name="issueId"
										value={formData.issueId}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(errors.issueId)}
										helperText={errors.issueId}
										SelectProps={{
											displayEmpty: true,
											IconComponent: ArrowDropDownIcon,
										}}
										InputLabelProps={{ shrink: true }}
										sx={{
											"& .MuiInputBase-root": {
												height: 56,
											},
											"& .MuiInputBase-input": {
												py: 1.25,
											},
											"& .MuiInputLabel-asterisk": {
												color: (t) =>
													t.palette.error.main,
											},
										}}
									>
										<MenuItem value="" disabled>
											Select an issue
										</MenuItem>
										{issueTypes.map((i) => (
											<MenuItem
												key={i.issue_id}
												value={i.issue_id}
											>
												{i.issue_label}
											</MenuItem>
										))}
									</MDInput>
								</MDBox>
								<MDBox mb={2}>
									<MDInput
										fullWidth
										multiline
										rows={4}
										label="Description (optional)"
										name="description"
										value={formData.description}
										onChange={handleChange}
										sx={{
											"& .MuiInputBase-input": {
												py: 1.25,
											},
										}}
									/>
								</MDBox>
								<MDBox mt={3}>
									<MDButton
										variant="gradient"
										color="info"
										type="submit"
										fullWidth
										disabled={loading}
									>
										{loading
											? "Submitting..."
											: "Submit Request"}
									</MDButton>
								</MDBox>
							</MDBox>
						</Card>
					</Grid>
				</Grid>
			</MDBox>
		</DashboardLayout>
	);
}
