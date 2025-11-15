import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DeviceStatusBadge from "./DeviceStatusBadge";

function DeviceCard({ device, onClick }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card
      sx={{
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick
          ? {
              boxShadow: 3,
              transform: "translateY(-2px)",
              transition: "all 0.3s",
            }
          : {},
      }}
      onClick={onClick}
    >
      <MDBox p={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <MDTypography variant="h6" fontWeight="medium">
            {device.device_type || "Unknown Type"}
          </MDTypography>
          <DeviceStatusBadge status={device.status} />
        </MDBox>
        <MDBox mb={1}>
          <MDTypography variant="caption" color="text" fontWeight="regular">
            Device ID: {device.device_id}
          </MDTypography>
        </MDBox>
        <MDBox mb={1}>
          <MDTypography variant="caption" color="text" fontWeight="regular">
            Car ID: {device.car_id || "N/A"}
          </MDTypography>
        </MDBox>
        <MDBox>
          <MDTypography variant="caption" color="text" fontWeight="regular">
            Last Heartbeat: {formatDate(device.last_heartbeat)}
          </MDTypography>
        </MDBox>
      </MDBox>
    </Card>
  );
}

DeviceCard.defaultProps = {
  onClick: null,
};

DeviceCard.propTypes = {
  device: PropTypes.shape({
    device_id: PropTypes.string.isRequired,
    device_type: PropTypes.string,
    status: PropTypes.string,
    car_id: PropTypes.string,
    last_heartbeat: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
};

export default DeviceCard;
