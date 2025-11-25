import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function TelemetryMetricCard({ title, value, unit, color, trend }) {
	const getTrendColor = () => {
		if (!trend) return "text";
		return trend > 0 ? "success" : trend < 0 ? "error" : "text";
	};

	const getTrendSymbol = () => {
		if (!trend || trend === 0) return "";
		return trend > 0 ? "↑" : "↓";
	};

	return (
		<Card>
			<MDBox p={2}>
				<MDTypography
					variant="caption"
					color="text"
					fontWeight="regular"
					textTransform="uppercase"
				>
					{title}
				</MDTypography>
				<MDBox display="flex" alignItems="center" mt={1}>
					<MDTypography
						variant="h4"
						fontWeight="bold"
						color={color || "dark"}
					>
						{value !== null && value !== undefined ? value : "N/A"}
						{value !== null && value !== undefined && unit && (
							<MDTypography
								variant="button"
								fontWeight="regular"
								color="text"
								component="span"
							>
								{" "}
								{unit}
							</MDTypography>
						)}
					</MDTypography>
					{trend !== null && trend !== undefined && trend !== 0 && (
						<MDBox ml={1}>
							<MDTypography
								variant="button"
								color={getTrendColor()}
								fontWeight="medium"
							>
								{getTrendSymbol()} {Math.abs(trend)}%
							</MDTypography>
						</MDBox>
					)}
				</MDBox>
			</MDBox>
		</Card>
	);
}

TelemetryMetricCard.defaultProps = {
	unit: null,
	color: "dark",
	trend: null,
};

TelemetryMetricCard.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	unit: PropTypes.string,
	color: PropTypes.string,
	trend: PropTypes.number,
};

export default TelemetryMetricCard;
