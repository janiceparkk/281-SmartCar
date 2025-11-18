import { AuthProvider } from "context/AuthContext";
import RoutesWrapper from "./RoutesWrapper";

export default function App() {
	return (
		<AuthProvider>
			<RoutesWrapper />
		</AuthProvider>
	);
}
