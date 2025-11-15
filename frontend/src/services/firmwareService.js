const API_BASE_URL = "http://localhost:5000/api";

const firmwareService = {
  async getAllVersions() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/firmware/versions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch firmware versions");
      }

      return data;
    } catch (error) {
      console.error("Error fetching firmware versions:", error);
      throw error;
    }
  },

  async createVersion(versionData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/firmware/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(versionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create firmware version");
      }

      return data;
    } catch (error) {
      console.error("Error creating firmware version:", error);
      throw error;
    }
  },

  async updateDeviceFirmware(deviceId, firmwareId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/firmware/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firmware_id: firmwareId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update device firmware");
      }

      return data;
    } catch (error) {
      console.error("Error updating device firmware:", error);
      throw error;
    }
  },
};

export default firmwareService;
