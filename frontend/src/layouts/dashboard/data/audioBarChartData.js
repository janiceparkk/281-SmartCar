/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState } from "react";

export default function AudioBarChartData(fetchAlerts) {
	const audioTypes = [
		"Collision",
		"Horn",
		"Voice",
		"Siren",
		"Animal",
		"Tire",
	];
	const [audioCounts, setAudioCounts] = useState([]);

	useEffect(() => {
		fetchAlerts().then((res) => {
			const alerts = Array.isArray(res.data) ? res.data : [];
			const counts = audioTypes.map(() => 0);

			alerts.forEach((a) => {
				const rawType =
					a.sound_classification ||
					a.audio_context?.classification ||
					a.alert_type ||
					"";

				const type = rawType.toLowerCase().replace(/_/g, "").trim();

				if (
					type.includes("collision") ||
					type.includes("crash") ||
					type.includes("impact")
				) {
					counts[audioTypes.indexOf("Collision")]++;
				} else if (type.includes("horn")) {
					counts[audioTypes.indexOf("Horn")]++;
				} else if (
					type.includes("voice") ||
					type.includes("talk") ||
					type.includes("speech")
				) {
					counts[audioTypes.indexOf("Voice")]++;
				} else if (
					type.includes("siren") ||
					type.includes("emergency")
				) {
					counts[audioTypes.indexOf("Siren")]++;
				} else if (
					type.includes("dog") ||
					type.includes("bark") ||
					type.includes("animal")
				) {
					counts[audioTypes.indexOf("Animal")]++;
				} else if (
					type.includes("tire") ||
					type.includes("screech") ||
					type.includes("skid")
				) {
					counts[audioTypes.indexOf("Tire")]++;
				}
			});

			setAudioCounts(counts);
		});
	}, [fetchAlerts]);

	const audioData = {
		labels: audioTypes,
		datasets: { label: "Counts", data: audioCounts },
	};

	return audioData;
}
