import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function TelemetryChart({ title, labels, datasets, color }) {
  const chartData = {
    labels,
    datasets: datasets.map((dataset) => ({
      ...dataset,
      borderColor: color || "rgb(75, 192, 192)",
      backgroundColor: color ? `${color}33` : "rgba(75, 192, 192, 0.2)",
      tension: 0.4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card>
      <MDBox p={2}>
        <MDTypography variant="h6" fontWeight="medium" mb={2}>
          {title}
        </MDTypography>
        <MDBox height="300px">
          <Line data={chartData} options={options} />
        </MDBox>
      </MDBox>
    </Card>
  );
}

TelemetryChart.defaultProps = {
  color: null,
};

TelemetryChart.propTypes = {
  title: PropTypes.string.isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(PropTypes.number).isRequired,
    })
  ).isRequired,
  color: PropTypes.string,
};

export default TelemetryChart;
