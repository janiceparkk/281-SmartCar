import { useState } from "react";
import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

import MDBox from "components/MDBox";

function CommandForm({ onSubmit, loading }) {
	const [formData, setFormData] = useState({
		commandType: "",
		priority: "normal",
		parameters: "",
	});
	const [formError, setFormError] = useState(null);

	const handleInputChange = (field, value) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		setFormError(null);
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		if (!formData.commandType) {
			setFormError("Please select a command type");
			return;
		}

		let parsedParameters = {};
		if (formData.parameters.trim()) {
			try {
				parsedParameters = JSON.parse(formData.parameters);
			} catch (error) {
				setFormError("Invalid JSON format in parameters");
				return;
			}
		}

		onSubmit({
			command_type: formData.commandType,
			priority: formData.priority,
			parameters: parsedParameters,
		});
	};

	const handleReset = () => {
		setFormData({
			commandType: "",
			priority: "normal",
			parameters: "",
		});
		setFormError(null);
	};

	return (
		<form onSubmit={handleSubmit}>
			{formError && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{formError}
				</Alert>
			)}

			<Grid container spacing={3}>
				<Grid item xs={12} md={6}>
					<TextField
						fullWidth
						select
						label="Command Type"
						value={formData.commandType}
						onChange={(e) =>
							handleInputChange("commandType", e.target.value)
						}
						required
						disabled={loading}
					>
						<MenuItem value="">Select command type</MenuItem>
						<MenuItem value="restart">Restart Device</MenuItem>
						<MenuItem value="diagnostic">Run Diagnostics</MenuItem>
						<MenuItem value="firmware_update">
							Firmware Update
						</MenuItem>
						<MenuItem value="reset">Factory Reset</MenuItem>
						<MenuItem value="custom">Custom Command</MenuItem>
					</TextField>
				</Grid>

				<Grid item xs={12} md={6}>
					<TextField
						fullWidth
						select
						label="Priority"
						value={formData.priority}
						onChange={(e) =>
							handleInputChange("priority", e.target.value)
						}
						disabled={loading}
					>
						<MenuItem value="high">High</MenuItem>
						<MenuItem value="normal">Normal</MenuItem>
						<MenuItem value="low">Low</MenuItem>
					</TextField>
				</Grid>

				<Grid item xs={12}>
					<TextField
						fullWidth
						multiline
						rows={4}
						label="Parameters (JSON)"
						value={formData.parameters}
						onChange={(e) =>
							handleInputChange("parameters", e.target.value)
						}
						placeholder='{"key": "value"}'
						helperText="Optional: Enter command parameters in JSON format"
						disabled={loading}
					/>
				</Grid>

				<Grid item xs={12}>
					<MDBox display="flex" gap={2}>
						<Button
							type="submit"
							variant="contained"
							color="info"
							disabled={loading}
						>
							{loading ? "Sending..." : "Send Command"}
						</Button>
						<Button
							variant="outlined"
							color="secondary"
							onClick={handleReset}
							disabled={loading}
						>
							Reset
						</Button>
					</MDBox>
				</Grid>
			</Grid>
		</form>
	);
}

CommandForm.propTypes = {
	onSubmit: PropTypes.func.isRequired,
	loading: PropTypes.bool,
};

CommandForm.defaultProps = {
	loading: false,
};

export default CommandForm;
