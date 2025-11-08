/**
 * Device Monitoring Dashboard (Phase 2)
 *
 * Real-time monitoring features:
 * - Live device status updates via WebSocket
 * - Connection quality visualization
 * - Heartbeat monitoring
 * - Real-time alerts and events
 * - Device state transitions (Online/Idle/Offline/No-Connection)
 */

import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import RefreshIcon from "@mui/icons-material/Refresh";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import DeviceStatusBadge from "components/DeviceStatusBadge";
import ConnectionQualityIndicator from "components/ConnectionQualityIndicator";
import useWebSocket from "hooks/useWebSocket";

import { Chip, Typography, Box, List, ListItem, ListItemText, Avatar } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

function DeviceMonitoring() {
  const { isConnected, devices, alerts, reconnect } = useWebSocket();
  const [deviceStats, setDeviceStats] = useState({
    online: 0,
    idle: 0,
    offline: 0,
    noConnection: 0,
  });

  // Calculate device statistics
  useEffect(() => {
    const stats = {
      online: devices.filter((d) => d.status === "Online").length,
      idle: devices.filter((d) => d.status === "Idle").length,
      offline: devices.filter((d) => d.status === "Offline").length,
      noConnection: devices.filter((d) => d.status === "No-Connection").length,
    };
    setDeviceStats(stats);
  }, [devices]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3}>
          {/* Header with WebSocket Status */}
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor={isConnected ? "success" : "error"}
                borderRadius="lg"
                coloredShadow={isConnected ? "success" : "error"}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Device Monitoring (Phase 2 - Real-time)
                </MDTypography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={isConnected ? "Connected" : "Disconnected"}
                    size="small"
                    sx={{
                      bgcolor: "white",
                      color: isConnected ? "success.main" : "error.main",
                      fontWeight: "bold",
                    }}
                  />
                  <Tooltip title="Reconnect">
                    <IconButton
                      onClick={reconnect}
                      size="small"
                      sx={{ color: "white" }}
                      disabled={isConnected}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </MDBox>
            </Card>
          </Grid>

          {/* Device Statistics Cards */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2} textAlign="center">
                <MDTypography variant="h6" fontWeight="medium" color="text">
                  Online
                </MDTypography>
                <MDTypography variant="h2" fontWeight="bold" color="success">
                  {deviceStats.online}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Devices actively connected
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2} textAlign="center">
                <MDTypography variant="h6" fontWeight="medium" color="text">
                  Idle
                </MDTypography>
                <MDTypography variant="h2" fontWeight="bold" color="warning">
                  {deviceStats.idle}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  No heartbeat for 1-5 min
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2} textAlign="center">
                <MDTypography variant="h6" fontWeight="medium" color="text">
                  Offline
                </MDTypography>
                <MDTypography variant="h2" fontWeight="bold" color="error">
                  {deviceStats.offline}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  No heartbeat for 5-30 min
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2} textAlign="center">
                <MDTypography variant="h6" fontWeight="medium" color="text">
                  No Connection
                </MDTypography>
                <MDTypography variant="h2" fontWeight="bold" color="dark">
                  {deviceStats.noConnection}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  No heartbeat for 30+ min
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          {/* Live Device Status */}
          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox pt={3} px={3}>
                <MDTypography variant="h6" fontWeight="medium">
                  Live Device Status
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Real-time updates via WebSocket
                </MDTypography>
              </MDBox>
              <MDBox p={3}>
                {devices.length === 0 ? (
                  <MDBox textAlign="center" py={3}>
                    <MDTypography variant="body2" color="text">
                      No devices connected. Waiting for devices to come online...
                    </MDTypography>
                  </MDBox>
                ) : (
                  <MDBox>
                    {devices.map((device) => (
                      <Card
                        key={device.device_id}
                        sx={{ mb: 2, p: 2, border: "1px solid #e0e0e0" }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={3}>
                            <MDTypography variant="h6" fontWeight="medium">
                              {device.device_id}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">
                              Car: {device.car_id}
                            </MDTypography>
                          </Grid>
                          <Grid item xs={12} md={2}>
                            <DeviceStatusBadge status={device.status} size="medium" />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <ConnectionQualityIndicator
                              connectionQuality={
                                typeof device.connection_quality === "string"
                                  ? JSON.parse(device.connection_quality)
                                  : device.connection_quality
                              }
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <MDTypography variant="caption" color="text">
                              Last heartbeat:
                            </MDTypography>
                            <MDTypography variant="body2" fontWeight="medium">
                              {formatRelativeTime(device.last_heartbeat)}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">
                              FW: {device.firmware_version || "N/A"}
                            </MDTypography>
                          </Grid>
                        </Grid>
                      </Card>
                    ))}
                  </MDBox>
                )}
              </MDBox>
            </Card>
          </Grid>

          {/* Recent Alerts and Events */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: "100%" }}>
              <MDBox pt={3} px={3}>
                <MDTypography variant="h6" fontWeight="medium">
                  Recent Events
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  Audio events and alerts
                </MDTypography>
              </MDBox>
              <MDBox p={2}>
                {alerts.length === 0 ? (
                  <MDBox textAlign="center" py={3}>
                    <MDTypography variant="body2" color="text">
                      No recent events
                    </MDTypography>
                  </MDBox>
                ) : (
                  <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                    {alerts.slice(0, 10).map((alert, index) => (
                      <ListItem
                        key={alert.alert_id || index}
                        alignItems="flex-start"
                        sx={{
                          borderLeft: 3,
                          borderColor: alert.confidence_score > 0.8 ? 'error.main' : 'warning.main',
                          mb: 1,
                          bgcolor: 'background.default',
                          borderRadius: 1
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: alert.confidence_score > 0.8 ? 'error.main' : 'warning.main',
                            width: 32,
                            height: 32,
                            mr: 2
                          }}
                        >
                          <FiberManualRecordIcon fontSize="small" />
                        </Avatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="medium">
                              {alert.sound_classification || alert.alert_type}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary" component="span">
                                {alert.car_id} • Confidence: {(alert.confidence_score * 100).toFixed(0)}%
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary" component="span">
                                {formatTimestamp(alert.createdAt)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </MDBox>
            </Card>
          </Grid>

          {/* Connection States Legend */}
          <Grid item xs={12}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Connection States Explained
                </MDTypography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <DeviceStatusBadge status="Online" size="small" />
                      <MDTypography variant="body2" color="text">
                        Heartbeat received within 60 seconds
                      </MDTypography>
                    </MDBox>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <DeviceStatusBadge status="Idle" size="small" />
                      <MDTypography variant="body2" color="text">
                        No heartbeat for 1-5 minutes
                      </MDTypography>
                    </MDBox>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <DeviceStatusBadge status="Offline" size="small" />
                      <MDTypography variant="body2" color="text">
                        No heartbeat for 5-30 minutes
                      </MDTypography>
                    </MDBox>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <DeviceStatusBadge status="No-Connection" size="small" />
                      <MDTypography variant="body2" color="text">
                        No heartbeat for 30+ minutes
                      </MDTypography>
                    </MDBox>
                  </Grid>
                </Grid>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default DeviceMonitoring;
