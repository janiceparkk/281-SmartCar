import MDTypography from "components/MDTypography";

export default function data() {
	return {
		columns: [
			{
				Header: "ID",
				accessor: "id",
			},
			{
				Header: "Owner",
				accessor: "owner",
			},
			{
				Header: "Car Name",
				accessor: "carName",
			},
			{
				Header: "Car Model",
				accessor: "model",
			},
			{
				Header: "Date",
				accessor: "date",
			},
			{
				Header: "Status",
				accessor: "status",
			},
			{
				Header: "Occurred",
				accessor: "occurred",
			},
			{ Header: "Ended", accessor: "ended", width: "10%", align: "left" },
			{
				Header: "Total Time",
				accessor: "time",
			},
		],

		rows: [
			{
				id: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						1
					</MDTypography>
				),
				owner: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						Harry Potter
					</MDTypography>
				),
				carName: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						car-1
					</MDTypography>
				),
				model: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						ABC
					</MDTypography>
				),
				date: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						2025-11-04
					</MDTypography>
				),
				status: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						Normal
					</MDTypography>
				),
				occurred: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						9:00
					</MDTypography>
				),
				ended: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						12:00
					</MDTypography>
				),
				time: (
					<MDTypography
						variant="caption"
						color="text"
						fontWeight="medium"
					>
						3h
					</MDTypography>
				),
			},
		],
	};
}
