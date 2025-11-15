const API_BASE_URL = "http://localhost:5000/api";

const telemetryService = {
  async getTelemetryData(deviceId, options = {}) {
    try {
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams();

      if (options.startDate) queryParams.append("startDate", options.startDate);
      if (options.endDate) queryParams.append("endDate", options.endDate);
      if (options.limit) queryParams.append("limit", options.limit);
      if (options.offset) queryParams.append("offset", options.offset);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/devices/${deviceId}/telemetry${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch telemetry data");
      }

      return data;
    } catch (error) {
      console.error("Error fetching telemetry data:", error);
      throw error;
    }
  },

  async submitTelemetry(deviceId, telemetryData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/telemetry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(telemetryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit telemetry data");
      }

      return data;
    } catch (error) {
      console.error("Error submitting telemetry data:", error);
      throw error;
    }
  },

  formatTelemetryForChart(telemetryData) {
    if (!telemetryData || !Array.isArray(telemetryData)) {
      return { labels: [], datasets: [] };
    }

    const labels = telemetryData.map((entry) => {
      const date = new Date(entry.timestamp);
      return date.toLocaleTimeString();
    });

    return {
      labels,
      batteryData: telemetryData.map((entry) => entry.battery_level),
      temperatureData: telemetryData.map((entry) => entry.temperature),
      signalStrengthData: telemetryData.map((entry) => entry.signal_strength),
    };
  },
};

export default telemetryService;
