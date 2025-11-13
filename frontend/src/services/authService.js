const API_URL = process.env.REACT_APP_API_URL;

export const registerUser = async (data) => {
	const response = await fetch(`${API_URL}/auth/register`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});

	const result = await response.json();
	if (!response.ok) throw new Error(result.message || "Registration failed");
	return result;
};

export const loginUser = async (data) => {
	const response = await fetch(`${API_URL}/auth/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});

	const result = await response.json();
	if (!response.ok) throw new Error(result.message || "Login failed");
	return result;
};
