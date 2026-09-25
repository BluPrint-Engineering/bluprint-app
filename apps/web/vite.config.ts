import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { z } from "zod";

const envDir = resolve(import.meta.dirname, "../..");

export default defineConfig(({ mode }) => {
	// Empty prefix: PORT/WEB_PORT have no VITE_ prefix, so they are only readable here.
	const { PORT, WEB_PORT, VITE_ALLOW_SELF_SIGNUP } = loadEnv(mode, envDir, "");
	// fails the build or dev server on a bad value, as the API does at boot, not the first /signup visit
	if (!z.stringbool().optional().safeParse(VITE_ALLOW_SELF_SIGNUP).success) {
		throw new Error(
			`VITE_ALLOW_SELF_SIGNUP must be true/1/yes/on or false/0/no/off, got "${VITE_ALLOW_SELF_SIGNUP}"`,
		);
	}

	return {
		plugins: [
			// a route file's own test lives beside it, e.g. routes/login.test.tsx
			tanstackRouter({ routeFileIgnorePattern: "\\.test\\.tsx$" }),
			react(),
			tailwindcss(),
		],
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
