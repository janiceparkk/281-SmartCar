const API_BASE_URL = "http://localhost:5000/api";

const carService = {
  async getAllCars() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/cars`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch cars");
      }

      return data;
    } catch (error) {
      console.error("Error fetching cars:", error);
      throw error;
    }
  },
};

export default carService;
