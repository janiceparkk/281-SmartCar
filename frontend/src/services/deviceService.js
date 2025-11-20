const API_BASE_URL = "http://localhost:5000/api";

const deviceService = {
  async getAllDevices(filters = {}) {
    try {
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams();

      if (filters.carId) queryParams.append("carId", filters.carId);
      if (filters.deviceType) queryParams.append("deviceType", filters.deviceType);
      if (filters.status) queryParams.append("status", filters.status);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/devices${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch devices");
      }

      return data;
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  },

  async getDeviceById(deviceId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch device");
      }

      return data;
    } catch (error) {
      console.error("Error fetching device:", error);
      throw error;
    }
  },

  async registerDevice(deviceData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deviceData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register device");
      }

      return data;
    } catch (error) {
      console.error("Error registering device:", error);
      throw error;
    }
  },

  async getDeviceStatus(deviceId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch device status");
      }

      return data;
    } catch (error) {
      console.error("Error fetching device status:", error);
      throw error;
    }
  },

  async getFleetHealth() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/fleet/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch fleet health");
      }

      return data;
    } catch (error) {
      console.error("Error fetching fleet health:", error);
      throw error;
    }
  },

  async getDeviceDiagnostics(deviceId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/diagnostics`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch device diagnostics");
      }

      return data;
    } catch (error) {
      console.error("Error fetching device diagnostics:", error);
      throw error;
    }
  },
};

export default deviceService;
