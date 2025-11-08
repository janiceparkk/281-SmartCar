/**
 * Connection Quality Indicator Component
 *
 * Displays device connection quality metrics:
 * - Signal strength (bar indicator)
 * - Latency (ms)
 * - Packet loss (%)
 */

import PropTypes from "prop-types";
import { Box, Typography, Tooltip, LinearProgress } from "@mui/material";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import SpeedIcon from "@mui/icons-material/Speed";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import MDBox from "components/MDBox";

const ConnectionQualityIndicator = ({ connectionQuality, compact = false }) => {
  if (!connectionQuality) {
    return <Typography variant="caption" color="text.secondary">No data</Typography>;
  }

  const { latency = 0, signalStrength = 0, packetLoss = 0 } = connectionQuality;

  // Determine signal quality color
  const getSignalColor = (strength) => {
    if (strength >= 80) return "success";
    if (strength >= 60) return "info";
    if (strength >= 40) return "warning";
    return "error";
  };

  // Determine latency color
  const getLatencyColor = (lat) => {
    if (lat < 50) return "success";
    if (lat < 100) return "info";
    if (lat < 200) return "warning";
    return "error";
  };

  // Determine packet loss color
  const getPacketLossColor = (loss) => {
    if (loss < 1) return "success";
    if (loss < 3) return "info";
    if (loss < 5) return "warning";
    return "error";
  };

  if (compact) {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="caption">Signal: {signalStrength}%</Typography><br />
            <Typography variant="caption">Latency: {latency}ms</Typography><br />
            <Typography variant="caption">Packet Loss: {packetLoss.toFixed(2)}%</Typography>
          </Box>
        }
      >
        <SignalCellularAltIcon
          color={getSignalColor(signalStrength)}
          fontSize="small"
        />
      </Tooltip>
    );
  }

  return (
    <MDBox>
      <MDBox display="flex" alignItems="center" mb={1}>
        <SignalCellularAltIcon
          color={getSignalColor(signalStrength)}
          fontSize="small"
          sx={{ mr: 1 }}
        />
        <Box flex={1}>
          <Typography variant="caption" color="text.secondary">
            Signal Strength
          </Typography>
          <LinearProgress
            variant="determinate"
            value={signalStrength}
            color={getSignalColor(signalStrength)}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
        <Typography variant="caption" fontWeight="bold" ml={1}>
          {signalStrength}%
        </Typography>
      </MDBox>

      <MDBox display="flex" justifyContent="space-between" alignItems="center">
        <MDBox display="flex" alignItems="center">
          <SpeedIcon
            color={getLatencyColor(latency)}
            fontSize="small"
            sx={{ mr: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            Latency: <strong>{latency}ms</strong>
          </Typography>
        </MDBox>

        <MDBox display="flex" alignItems="center">
          <ErrorOutlineIcon
            color={getPacketLossColor(packetLoss)}
            fontSize="small"
            sx={{ mr: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            Loss: <strong>{packetLoss.toFixed(2)}%</strong>
          </Typography>
        </MDBox>
      </MDBox>
    </MDBox>
  );
};

ConnectionQualityIndicator.propTypes = {
  connectionQuality: PropTypes.shape({
    latency: PropTypes.number,
    signalStrength: PropTypes.number,
    packetLoss: PropTypes.number,
  }),
  compact: PropTypes.bool,
};

export default ConnectionQualityIndicator;
