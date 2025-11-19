import PropTypes from "prop-types";
import MDBadge from "components/MDBadge";
import { Box } from "@mui/material";

function DeviceStatusBadge({ status }) {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case "online":
        return "success";
      case "offline":
        return "error";
      case "idle":
        return "warning";
      case "maintenance":
        return "info";
      default:
        return "secondary";
    }
  };

  const getStatusText = () => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  };

  return (
    <Box sx={{ transition: "all 0.3s ease-in-out" }}>
      <MDBadge badgeContent={getStatusText()} color={getStatusColor()} variant="gradient" size="sm" />
    </Box>
  );
}

DeviceStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export default DeviceStatusBadge;
