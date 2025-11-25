import { useEffect, useState } from "react";
import axios from "axios";

function normalizeAlerts(data) {
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.requests)) return data.requests;
	return [];
}

export default function useAlertLogsData() {
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					setAlerts([]);
					return;
				}

				const res = await axios.get(
					`${process.env.REACT_APP_API_URL}/alerts`,
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				);

				const list = normalizeAlerts(res.data);
				if (alive) setAlerts(list);
			} catch (e) {
				if (alive) setError(e);
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, []);

	return { alerts, loading, error };
}
