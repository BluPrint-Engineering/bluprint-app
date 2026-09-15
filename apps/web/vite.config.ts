import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const envDir = resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
	// Empty prefix: PORT/WEB_PORT have no VITE_ prefix, so they are only readable here.
	const { PORT, WEB_PORT } = loadEnv(mode, envDir, "");

	return {
		plugins: [tanstackRouter(), react(), tailwindcss()],
		envDir,
		resolve: {
			alias: {
				"@": resolve(import.meta.dirname, "./src"),
			},
		},
		server: {
			port: Number(WEB_PORT) || 5173,
			strictPort: true,
			proxy: {
				"/api": { target: `http://localhost:${PORT || 3000}` },
			},
		},
		test: {
			environment: "jsdom",
			globals: true,
			setupFiles: "./src/test/setup.ts",
		},
	};
});
