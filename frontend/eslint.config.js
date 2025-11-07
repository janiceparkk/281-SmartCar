// eslint.config.js
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
	{ ignores: ["node_modules/**", "dist/**", "build/**", "public/**"] },

	js.configs.recommended,

	{
		files: ["src/**/*.{js,jsx}"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: { ...globals.browser, ...globals.node },
			parserOptions: { ecmaFeatures: { jsx: true } }, // JSX for JS/JSX
		},
		plugins: {
			react,
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		settings: { react: { version: "detect" } },
		rules: {
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
			"react/react-in-jsx-scope": "off",
		},
	},
];
