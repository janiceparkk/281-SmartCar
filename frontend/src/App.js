// src/App.js
import { AuthProvider } from "context/AuthContext";
import RoutesWrapper from "./RoutesWrapper"; // We'll move all previous App.js logic here

export default function App() {
	return (
		<AuthProvider>
			<RoutesWrapper />
		</AuthProvider>
	);
}
