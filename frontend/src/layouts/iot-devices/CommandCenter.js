import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import CommandForm from "components/IoTDevices/CommandForm";
import CommandHistoryList from "components/IoTDevices/CommandHistoryList";
import commandService from "services/commandService";
import deviceService from "services/deviceService";

function CommandCenter() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchDeviceInfo = useCallback(async () => {
    try {
      const response = await deviceService.getDeviceById(deviceId);
      setDevice(response.device);
    } catch (err) {
      console.error("Error fetching device info:", err);
    }
  }, [deviceId]);

  const fetchCommandHistory = useCallback(async () => {
    try {
      setCommandHistory([]);
    } catch (err) {
      console.error("Error fetching command history:", err);
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) {
      fetchDeviceInfo();
      fetchCommandHistory();
    }
  }, [deviceId, fetchDeviceInfo, fetchCommandHistory]);

  const handleSubmitCommand = async (commandData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await commandService.sendCommand(deviceId, commandData);

      setSuccess(
        `Command sent successfully! Command ID: ${response.command?.command_id || "N/A"}`
      );

      setCommandHistory((prev) => [response.command, ...prev]);

      fetchCommandHistory();
    } catch (err) {
      console.error("Error sending command:", err);
      setError(err.message || "Failed to send command");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDevice = () => {
    navigate(`/iot-devices/${deviceId}`);
  };

  const handleBackToDashboard = () => {
    navigate("/iot-devices");
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDBox>
                  <MDTypography variant="h6" color="white">
                    Command Center
                  </MDTypography>
                  {device && (
                    <MDTypography variant="caption" color="white" opacity={0.8}>
                      Device: {device.device_id} ({device.device_type})
                    </MDTypography>
                  )}
                </MDBox>
                <MDBox display="flex" gap={1}>
                  <Button
                    variant="contained"
                    color="white"
                    size="small"
                    onClick={handleBackToDevice}
                    sx={{
                      backgroundColor: "white",
                      color: "info.main",
                      "&:hover": {
                        backgroundColor: "grey.100",
                      },
                    }}
                  >
                    Device Details
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleBackToDashboard}
                    sx={{
                      color: "white",
                      borderColor: "white",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    Dashboard
                  </Button>
                </MDBox>
              </MDBox>

              <MDBox p={3}>
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    {success}
                  </Alert>
                )}

                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Send Command
                </MDTypography>

                <CommandForm onSubmit={handleSubmitCommand} loading={loading} />

                <Divider sx={{ my: 4 }} />

                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Command History
                </MDTypography>

                {commandHistory.length === 0 ? (
                  <MDBox py={6} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      No command history available yet.
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block" mt={1}>
                      Commands sent to this device will appear here.
                    </MDTypography>
                  </MDBox>
                ) : (
                  <CommandHistoryList commands={commandHistory} />
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default CommandCenter;
