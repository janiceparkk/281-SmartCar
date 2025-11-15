import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import firmwareService from "services/firmwareService";

function FirmwareManagement() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    version: "",
    releaseNotes: "",
    compatibleDevices: "",
  });

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await firmwareService.getAllVersions();
      setVersions(response.firmware_versions || []);
    } catch (err) {
      console.error("Error fetching firmware versions:", err);
      setError(err.message || "Failed to fetch firmware versions");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.version) {
      setError("Please enter a version number");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await firmwareService.createVersion({
        version: formData.version,
        release_notes: formData.releaseNotes,
        compatible_devices: formData.compatibleDevices,
      });

      setSuccess("Firmware version created successfully!");
      setFormData({
        version: "",
        releaseNotes: "",
        compatibleDevices: "",
      });

      fetchVersions();
    } catch (err) {
      console.error("Error creating firmware version:", err);
      setError(err.message || "Failed to create firmware version");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/iot-devices");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
                <MDTypography variant="h6" color="white">
                  Firmware Management
                </MDTypography>
                <Button
                  variant="contained"
                  color="white"
                  size="small"
                  onClick={handleBackToDashboard}
                  sx={{
                    backgroundColor: "white",
                    color: "info.main",
                    "&:hover": {
                      backgroundColor: "grey.100",
                    },
                  }}
                >
                  Back to Dashboard
                </Button>
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
                  Create New Firmware Version
                </MDTypography>

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Version Number"
                        value={formData.version}
                        onChange={(e) => handleInputChange("version", e.target.value)}
                        placeholder="1.0.0"
                        required
                        disabled={submitting}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Compatible Devices"
                        value={formData.compatibleDevices}
                        onChange={(e) => handleInputChange("compatibleDevices", e.target.value)}
                        placeholder="OBD_Scanner, GPS_Tracker"
                        helperText="Comma-separated list of device types"
                        disabled={submitting}
                      />
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="info"
                        fullWidth
                        disabled={submitting}
                        sx={{ height: "56px" }}
                      >
                        {submitting ? "Creating..." : "Create Version"}
                      </Button>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Release Notes"
                        value={formData.releaseNotes}
                        onChange={(e) => handleInputChange("releaseNotes", e.target.value)}
                        placeholder="Enter release notes here..."
                        disabled={submitting}
                      />
                    </Grid>
                  </Grid>
                </form>

                <Divider sx={{ my: 4 }} />

                <MDTypography variant="h6" fontWeight="medium" mb={2}>
                  Firmware Versions
                </MDTypography>

                {loading ? (
                  <MDBox py={6} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      Loading firmware versions...
                    </MDTypography>
                  </MDBox>
                ) : versions.length === 0 ? (
                  <MDBox py={6} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      No firmware versions available yet.
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block" mt={1}>
                      Create your first firmware version using the form above.
                    </MDTypography>
                  </MDBox>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Version</TableCell>
                          <TableCell>Compatible Devices</TableCell>
                          <TableCell>Release Notes</TableCell>
                          <TableCell>Released At</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {versions.map((version) => (
                          <TableRow key={version.firmware_id}>
                            <TableCell>
                              <MDTypography variant="button" fontWeight="medium">
                                {version.version}
                              </MDTypography>
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption" color="text">
                                {version.compatible_devices || "All"}
                              </MDTypography>
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption" color="text">
                                {version.release_notes || "N/A"}
                              </MDTypography>
                            </TableCell>
                            <TableCell>
                              <MDTypography variant="caption" color="text">
                                {formatDate(version.released_at)}
                              </MDTypography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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

export default FirmwareManagement;
