import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import MDTypography from "components/MDTypography";

function LiveHeartbeat({ lastHeartbeat }) {
	const [timeAgo, setTimeAgo] = useState("");
	const [color, setColor] = useState("success");

	useEffect(() => {
		const updateTimeAgo = () => {
			if (!lastHeartbeat) {
				setTimeAgo("Never");
				setColor("error");
				return;
			}

			const now = new Date();
			const heartbeatTime = new Date(lastHeartbeat);
			const secondsAgo = Math.floor((now - heartbeatTime) / 1000);

			let displayText = "";
			let statusColor = "success";

			if (secondsAgo < 0) {
				displayText = "Just now";
				statusColor = "success";
			} else if (secondsAgo < 60) {
				displayText = `${secondsAgo}s ago`;
				statusColor = "success"; // Green - within 1 minute (ONLINE)
			} else if (secondsAgo < 300) {
				const minutes = Math.floor(secondsAgo / 60);
				displayText = `${minutes}m ${secondsAgo % 60}s ago`;
				statusColor = "warning"; // Orange - 1-5 minutes (IDLE)
			} else {
				const minutes = Math.floor(secondsAgo / 60);
				if (minutes < 60) {
					displayText = `${minutes}m ago`;
				} else {
					const hours = Math.floor(minutes / 60);
					displayText = `${hours}h ${minutes % 60}m ago`;
				}
				statusColor = "error"; // Red - over 5 minutes (OFFLINE)
			}

			setTimeAgo(displayText);
			setColor(statusColor);
		};

		// Update immediately
		updateTimeAgo();

		// Update every second
		const interval = setInterval(updateTimeAgo, 1000);

		return () => clearInterval(interval);
	}, [lastHeartbeat]);

	return (
		<MDTypography
			variant="caption"
			color={color}
			fontWeight="medium"
			sx={{ transition: "color 0.5s ease-in-out" }}
		>
			{timeAgo}
		</MDTypography>
	);
}

LiveHeartbeat.propTypes = {
	lastHeartbeat: PropTypes.string,
};

export default LiveHeartbeat;
