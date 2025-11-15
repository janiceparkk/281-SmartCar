const API_BASE_URL = "http://localhost:5000/api";

const commandService = {
  async sendCommand(deviceId, commandData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(commandData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send command");
      }

      return data;
    } catch (error) {
      console.error("Error sending command:", error);
      throw error;
    }
  },

  async getCommandStatus(deviceId, commandId) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/devices/${deviceId}/commands/${commandId}/status`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get command status");
      }

      return data;
    } catch (error) {
      console.error("Error getting command status:", error);
      throw error;
    }
  },

  async pollCommandStatus(deviceId, commandId, maxAttempts = 10, intervalMs = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.getCommandStatus(deviceId, commandId);

        if (response.command.status === "completed" || response.command.status === "failed") {
          return response;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error("Command status polling timeout");
  },
};

export default commandService;
