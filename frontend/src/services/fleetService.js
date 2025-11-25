const fleetService = {
	async getFleetMap() {
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.REACT_APP_API_URL}/devices/fleet/map`,
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
				throw new Error(data.message || "Failed to fetch fleet map");
			}

			return data;
		} catch (error) {
			console.error("Error fetching fleet map:", error);
			throw error;
		}
	},

	async getFleetAnalytics() {
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.REACT_APP_API_URL}/devices/fleet/analytics`,
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
				throw new Error(
					data.message || "Failed to fetch fleet analytics"
				);
			}

			return data;
		} catch (error) {
			console.error("Error fetching fleet analytics:", error);
			throw error;
		}
	},
};

export default fleetService;
