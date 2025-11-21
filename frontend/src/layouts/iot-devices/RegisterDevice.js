import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import deviceService from "services/deviceService";
import carService from "services/carService";

function RegisterDevice() {
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [formData, setFormData] = useState({
    carId: "",
    deviceType: "",
  });

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const response = await carService.getAllCars();
      setCars(response.cars || []);
    } catch (err) {
      console.error("Error fetching cars:", err);
      setError("Failed to load cars. Please try again.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.carId || !formData.deviceType) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setCredentials(null);

      const response = await deviceService.registerDevice({
        car_id: formData.carId,
        device_type: formData.deviceType,
      });

      setSuccess("Device registered successfully!");
      setCredentials({
        deviceId: response.device.device_id,
        mqttUsername: response.mqtt_credentials.username,
        mqttPassword: response.mqtt_credentials.password,
      });

      setFormData({
        carId: "",
        deviceType: "",
      });
    } catch (err) {
      console.error("Error registering device:", err);
      setError(err.message || "Failed to register device. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/iot-devices");
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8} lg={6}>
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
              >
                <MDTypography variant="h6" color="white">
                  Register New IoT Device
                </MDTypography>
              </MDBox>

              <MDBox p={3}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && credentials && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <MDTypography variant="body2" fontWeight="bold" mb={1}>
                      {success}
                    </MDTypography>
                    <Divider sx={{ my: 1 }} />
                    <MDTypography variant="caption" display="block" mt={1}>
                      Device ID: {credentials.deviceId}
                    </MDTypography>
                    <MDTypography variant="caption" display="block">
                      MQTT Username: {credentials.mqttUsername}
                    </MDTypography>
                    <MDTypography variant="caption" display="block">
                      MQTT Password: {credentials.mqttPassword}
                    </MDTypography>
                    <MDTypography variant="caption" display="block" mt={1} color="warning">
                      Please save these credentials securely. They will not be shown again.
                    </MDTypography>
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        variant="outlined"
                        label="Select Car"
                        value={formData.carId}
                        onChange={(e) => handleInputChange("carId", e.target.value)}
                        required
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        SelectProps={{ displayEmpty: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            height: '56px'
                          }
                        }}
                      >
                        <MenuItem value="">Select a car</MenuItem>
                        {cars.map((car) => (
                          <MenuItem key={car.car_id} value={car.car_id}>
                            {car.car_id} - {car.make} {car.model} ({car.year})
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        select
                        variant="outlined"
                        label="Device Type"
                        value={formData.deviceType}
                        onChange={(e) => handleInputChange("deviceType", e.target.value)}
                        required
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                        SelectProps={{ displayEmpty: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            height: '56px'
                          }
                        }}
                      >
                        <MenuItem value="">Select device type</MenuItem>
                        <MenuItem value="OBD_Scanner">OBD Scanner</MenuItem>
                        <MenuItem value="GPS_Tracker">GPS Tracker</MenuItem>
                        <MenuItem value="Dashcam">Dashcam</MenuItem>
                        <MenuItem value="Sensor_Module">Sensor Module</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <MDBox display="flex" gap={2}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="info"
                          fullWidth
                          disabled={loading}
                        >
                          {loading ? "Registering..." : "Register Device"}
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          fullWidth
                          onClick={handleBackToDashboard}
                          disabled={loading}
                        >
                          Back to Dashboard
                        </Button>
                      </MDBox>
                    </Grid>
                  </Grid>
                </form>

                <MDBox mt={3}>
                  <MDTypography variant="caption" color="text">
                    Note: After registering, you will receive MQTT credentials for the device. Please
                    save them securely as they will only be shown once.
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default RegisterDevice;
