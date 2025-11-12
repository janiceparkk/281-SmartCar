import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedComponent = ({ component }) => {
	const token = localStorage.getItem("token");

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	try {
		const decoded = jwtDecode(token);
		const now = Date.now() / 1000;
		if (decoded.exp < now) {
			// Token expired
			localStorage.removeItem("token");
			return <Navigate to="/login" replace />;
		}
	} catch (err) {
		// Invalid token
		localStorage.removeItem("token");
		return <Navigate to="/login" replace />;
	}

	return component;
};

export default ProtectedComponent;
