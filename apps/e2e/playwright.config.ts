import { defineConfig, devices } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "./auth-state";
import {
	API_BASE_URL,
	DATABASE_URL_E2E,
	E2E_API_PORT,
	E2E_WEB_PORT,
	WEB_BASE_URL,
} from "./env";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: [["html", { open: "never" }], ["list"]],
	outputDir: "test-results",
	use: {
		baseURL: WEB_BASE_URL,
		screenshot: { mode: "on", fullPage: true },
		video: process.env.E2E_VIDEO ? "on" : "retain-on-failure",
		trace: "on-first-retry",
	},
	projects: [
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "iPhone 13",
			use: {
				...devices["iPhone 13"],
				storageState: ADMIN_STORAGE_STATE,
			},
			dependencies: ["setup"],
		},
		{
			name: "Desktop Chrome",
			use: {
				...devices["Desktop Chrome"],
				storageState: ADMIN_STORAGE_STATE,
			},
			dependencies: ["setup"],
		},
	],
	webServer: [
		{
			command: "bun run start",
			cwd: "../api",
			url: `${API_BASE_URL}/api/health`,
			reuseExistingServer: false,
			env: {
				PORT: String(E2E_API_PORT),
				DATABASE_URL: DATABASE_URL_E2E,
				CORS_ORIGIN: WEB_BASE_URL,
				BETTER_AUTH_URL: API_BASE_URL,
				ALLOW_SELF_SIGNUP: "true",
				PASSWORD_BREACH_CHECK: "false",
			},
		},
		{
			command: `bunx vite preview --port ${E2E_WEB_PORT} --strictPort`,
			cwd: "../web",
			url: WEB_BASE_URL,
			reuseExistingServer: false,
			env: {
				PORT: String(E2E_API_PORT),
			},
		},
	],
});
