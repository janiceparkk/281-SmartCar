import { useEffect, useState } from "react";
import axios from "axios";

export default function useServiceLogsData() {
	const [serviceLogs, setServiceLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					setLoading(false);
					setServiceLogs([]);
					return;
				}

				const res = await axios.get(
					`${process.env.REACT_APP_API_URL}/serviceRequests`,
					{
						headers: { Authorization: `Bearer ${token}` },
					}
				);

				const list = Array.isArray(res.data)
					? res.data
					: res.data?.requests || [];
				if (alive) setServiceLogs(list);
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

	return { serviceLogs, loading, error };
}
