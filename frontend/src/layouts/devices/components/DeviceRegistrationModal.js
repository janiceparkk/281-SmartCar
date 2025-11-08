/**
 * Device Registration Modal Component (Phase 1)
 *
 * Allows users to register new IoT devices with:
 * - Device ID
 * - Device Type
 * - Car Assignment
 * - Firmware Version
 * - Certificate Upload (optional)
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Alert,
  Box,
  Typography,
} from "@mui/material";
import axios from "axios";

const API_URL = "http://localhost:3001/api";

const DeviceRegistrationModal = ({ open, onClose, onSuccess, device }) => {
  const [formData, setFormData] = useState({
    deviceId: "",
    deviceType: "Temperature Sensor",
    carId: "",
    firmwareVersion: "1.0.0",
    certificate: "",
  });

  const [cars, setCars] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const deviceTypes = [
    "Temperature Sensor",
    "GPS Tracker",
    "Camera Module",
    "Audio Sensor",
    "Microphone",
    "Lidar Sensor",
    "Radar Sensor",
    "Accelerometer",
    "Gyroscope",
    "OBD-II Scanner",
  ];

  // Fetch available cars for assignment
  useEffect(() => {
    if (open) {
      fetchCars();
    }
  }, [open]);

  // Pre-fill form if editing existing device
  useEffect(() => {
    if (device) {
      setFormData({
        deviceId: device.device_id || "",
        deviceType: device.device_type || "Temperature Sensor",
        carId: device.car_id || "",
        firmwareVersion: device.firmware_version || "1.0.0",
        certificate: "",
      });
    } else {
      // Reset form for new device
      setFormData({
        deviceId: "",
        deviceType: "Temperature Sensor",
        carId: "",
        firmwareVersion: "1.0.0",
        certificate: "",
      });
    }
    setError("");
  }, [device, open]);

  const fetchCars = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/cars`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCars(response.data);
    } catch (error) {
      console.error("Error fetching cars:", error);
      setError("Failed to load available cars");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCertificateUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          certificate: event.target.result,
        }));
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // Validate required fields
      if (!formData.deviceId || !formData.carId) {
        setError("Device ID and Car ID are required");
        setLoading(false);
        return;
      }

      const payload = {
        deviceId: formData.deviceId,
        deviceType: formData.deviceType,
        carId: formData.carId,
        firmwareVersion: formData.firmwareVersion,
        certificate: formData.certificate || null,
      };

      await axios.post(`${API_URL}/devices/register`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSuccess();
    } catch (error) {
      console.error("Error registering device:", error);
      setError(
        error.response?.data?.message || "Failed to register device. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {device ? "Edit Device" : "Register New Device"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Device ID"
            name="deviceId"
            value={formData.deviceId}
            onChange={handleChange}
            fullWidth
            required
            helperText="Unique identifier for the device (e.g., IOT-001)"
            disabled={!!device} // Can't change ID when editing
          />

          <TextField
            label="Device Type"
            name="deviceType"
            value={formData.deviceType}
            onChange={handleChange}
            select
            fullWidth
            required
          >
            {deviceTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Car Assignment"
            name="carId"
            value={formData.carId}
            onChange={handleChange}
            select
            fullWidth
            required
            helperText="Select the car this device will be attached to"
          >
            {cars.length === 0 ? (
              <MenuItem disabled>No cars available</MenuItem>
            ) : (
              cars.map((car) => (
                <MenuItem key={car.car_id} value={car.car_id}>
                  {car.car_id} - {car.model || "Unknown Model"}
                </MenuItem>
              ))
            )}
          </TextField>

          <TextField
            label="Firmware Version"
            name="firmwareVersion"
            value={formData.firmwareVersion}
            onChange={handleChange}
            fullWidth
            helperText="Current firmware version (e.g., 1.0.0)"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Device Certificate (Optional)
            </Typography>
            <Button variant="outlined" component="label" fullWidth>
              Upload X.509 Certificate
              <input
                type="file"
                hidden
                accept=".pem,.crt,.cer"
                onChange={handleCertificateUpload}
              />
            </Button>
            {formData.certificate && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: "block" }}>
                Certificate uploaded successfully
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !formData.deviceId || !formData.carId}
        >
          {loading ? "Registering..." : device ? "Update" : "Register"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

DeviceRegistrationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  device: PropTypes.object,
};

export default DeviceRegistrationModal;
