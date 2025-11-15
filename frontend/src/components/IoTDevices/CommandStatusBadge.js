import PropTypes from "prop-types";
import MDBadge from "components/MDBadge";

function CommandStatusBadge({ status }) {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "sent":
        return "info";
      case "failed":
        return "error";
      default:
        return "secondary";
    }
  };

  const getStatusText = () => {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  };

  return (
    <MDBadge badgeContent={getStatusText()} color={getStatusColor()} variant="gradient" size="sm" />
  );
}

CommandStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export default CommandStatusBadge;
