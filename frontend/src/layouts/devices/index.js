/**
 * Device Management Layout (Phase 1)
 *
 * Features:
 * - List all registered devices
 * - Device registration form
 * - Device details view
 * - Filter by status, type, car
 */

import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

import DeviceStatusBadge from "components/DeviceStatusBadge";
import ConnectionQualityIndicator from "components/ConnectionQualityIndicator";
import DeviceRegistrationModal from "./components/DeviceRegistrationModal";

import axios from "axios";

const API_URL = "http://localhost:3001/api";

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Fetch devices from backend
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(response.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Refresh devices every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (device = null) => {
    setSelectedDevice(device);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedDevice(null);
  };

  const handleDeviceRegistered = () => {
    handleCloseModal();
    fetchDevices();
  };

  // Format data for DataTable
  const columns = [
    { Header: "Device ID", accessor: "device_id", width: "15%" },
    { Header: "Type", accessor: "device_type", width: "15%" },
    { Header: "Car ID", accessor: "car_id", width: "12%" },
    {
      Header: "Status",
      accessor: "status",
      width: "12%",
      Cell: ({ value }) => <DeviceStatusBadge status={value} />,
    },
    {
      Header: "Connection Quality",
      accessor: "connection_quality",
      width: "20%",
      Cell: ({ value }) => (
        <ConnectionQualityIndicator
          connectionQuality={typeof value === "string" ? JSON.parse(value) : value}
          compact
        />
      ),
    },
    {
      Header: "Firmware",
      accessor: "firmware_version",
      width: "10%",
    },
    {
      Header: "Last Heartbeat",
      accessor: "last_heartbeat",
      width: "16%",
      Cell: ({ value }) => {
        if (!value) return "Never";
        const date = new Date(value);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
      },
    },
  ];

  const rows = devices.map((device) => ({
    device_id: device.device_id,
    device_type: device.device_type,
    car_id: device.car_id,
    status: device.status,
    connection_quality: device.connection_quality,
    firmware_version: device.firmware_version || "N/A",
    last_heartbeat: device.last_heartbeat,
  }));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
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
                  Device Management (Phase 1)
                </MDTypography>
                <Button
                  variant="contained"
                  color="white"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenModal()}
                >
                  Register Device
                </Button>
              </MDBox>
              <MDBox pt={3}>
                {loading ? (
                  <MDBox p={3} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      Loading devices...
                    </MDTypography>
                  </MDBox>
                ) : devices.length === 0 ? (
                  <MDBox p={3} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      No devices registered yet. Click "Register Device" to add your first device.
                    </MDTypography>
                  </MDBox>
                ) : (
                  <DataTable
                    table={{ columns, rows }}
                    isSorted={false}
                    entriesPerPage={false}
                    showTotalEntries={true}
                    noEndBorder
                  />
                )}
              </MDBox>
            </Card>
          </Grid>

          {/* Device Statistics Card */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" fontWeight="medium">
                  Total Devices
                </MDTypography>
                <MDTypography variant="h3" fontWeight="bold" color="info">
                  {devices.length}
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" fontWeight="medium">
                  Online
                </MDTypography>
                <MDTypography variant="h3" fontWeight="bold" color="success">
                  {devices.filter((d) => d.status === "Online").length}
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" fontWeight="medium">
                  Idle/Offline
                </MDTypography>
                <MDTypography variant="h3" fontWeight="bold" color="warning">
                  {devices.filter((d) => d.status === "Idle" || d.status === "Offline").length}
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" fontWeight="medium">
                  No Connection
                </MDTypography>
                <MDTypography variant="h3" fontWeight="bold" color="error">
                  {devices.filter((d) => d.status === "No-Connection").length}
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />

      {/* Device Registration Modal */}
      <DeviceRegistrationModal
        open={openModal}
        onClose={handleCloseModal}
        onSuccess={handleDeviceRegistered}
        device={selectedDevice}
      />
    </DashboardLayout>
  );
}

export default Devices;
