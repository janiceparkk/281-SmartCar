/**
 * Device Status Badge Component
 *
 * Displays device connection status with color-coded badge
 * Status: Online (green), Idle (yellow), Offline (orange), No-Connection (red)
 */

import PropTypes from "prop-types";
import { Chip } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

const DeviceStatusBadge = ({ status, size = "small" }) => {
  const getStatusColor = () => {
    switch (status) {
      case "Online":
        return "success";
      case "Idle":
        return "warning";
      case "Offline":
        return "error";
      case "No-Connection":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusIcon = () => {
    return <FiberManualRecordIcon sx={{ fontSize: size === "small" ? 12 : 16 }} />;
  };

  return (
    <Chip
      label={status || "Unknown"}
      color={getStatusColor()}
      size={size}
      icon={getStatusIcon()}
      sx={{ fontWeight: "medium" }}
    />
  );
};

DeviceStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  size: PropTypes.oneOf(["small", "medium"]),
};

export default DeviceStatusBadge;
