import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

import fleetService from "services/fleetService";

ChartJS.register(ArcElement, Tooltip, Legend);

function FleetAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fleetService.getFleetAnalytics();
      setAnalytics(response);
    } catch (err) {
      console.error("Error fetching fleet analytics:", err);
      setError(err.message || "Failed to fetch fleet analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/iot-devices");
  };

  const getDeviceTypeChartData = () => {
    if (!analytics?.device_type_distribution) {
      return { labels: [], datasets: [] };
    }

    const labels = Object.keys(analytics.device_type_distribution);
    const data = Object.values(analytics.device_type_distribution);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "rgba(255, 99, 132, 0.8)",
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 206, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getFirmwareChartData = () => {
    if (!analytics?.firmware_distribution) {
      return { labels: [], datasets: [] };
    }

    const labels = Object.keys(analytics.firmware_distribution);
    const data = Object.values(analytics.firmware_distribution);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "rgba(153, 102, 255, 0.8)",
            "rgba(255, 159, 64, 0.8)",
            "rgba(75, 192, 192, 0.8)",
            "rgba(54, 162, 235, 0.8)",
          ],
          borderColor: [
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(54, 162, 235, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={6} pb={3}>
          <MDBox textAlign="center" py={6}>
            <MDTypography variant="h6" color="text">
              Loading fleet analytics...
            </MDTypography>
          </MDBox>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

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
                  Fleet Analytics
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

                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} md={3}>
                    <ComplexStatisticsCard
                      color="dark"
                      title="Total Devices"
                      count={analytics?.total_devices || 0}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <ComplexStatisticsCard
                      color="success"
                      title="Online Devices"
                      count={analytics?.online_devices || 0}
                      percentage={{
                        color: "success",
                        amount: `${analytics?.online_percentage || 0}%`,
                        label: "of total",
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <ComplexStatisticsCard
                      color="warning"
                      title="Average Uptime"
                      count={`${analytics?.average_uptime || 0}%`}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <ComplexStatisticsCard
                      color="error"
                      title="Total Alerts"
                      count={analytics?.total_alerts || 0}
                    />
                  </Grid>
                </Grid>

                {analytics && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card>
                        <MDBox p={3}>
                          <MDTypography variant="h6" fontWeight="medium" mb={2}>
                            Device Type Distribution
                          </MDTypography>
                          {analytics.device_type_distribution &&
                          Object.keys(analytics.device_type_distribution).length > 0 ? (
                            <MDBox height="300px" display="flex" justifyContent="center" alignItems="center">
                              <Pie data={getDeviceTypeChartData()} options={{ maintainAspectRatio: false }} />
                            </MDBox>
                          ) : (
                            <MDBox py={4} textAlign="center">
                              <MDTypography variant="body2" color="text">
                                No device type data available
                              </MDTypography>
                            </MDBox>
                          )}
                        </MDBox>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card>
                        <MDBox p={3}>
                          <MDTypography variant="h6" fontWeight="medium" mb={2}>
                            Firmware Version Distribution
                          </MDTypography>
                          {analytics.firmware_distribution &&
                          Object.keys(analytics.firmware_distribution).length > 0 ? (
                            <MDBox height="300px" display="flex" justifyContent="center" alignItems="center">
                              <Pie data={getFirmwareChartData()} options={{ maintainAspectRatio: false }} />
                            </MDBox>
                          ) : (
                            <MDBox py={4} textAlign="center">
                              <MDTypography variant="body2" color="text">
                                No firmware version data available
                              </MDTypography>
                            </MDBox>
                          )}
                        </MDBox>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {!analytics && (
                  <MDBox py={6} textAlign="center">
                    <MDTypography variant="body2" color="text">
                      No analytics data available
                    </MDTypography>
                  </MDBox>
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

export default FleetAnalytics;
