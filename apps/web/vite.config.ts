import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tanstackRouter(), react(), tailwindcss()],
	envDir: resolve(import.meta.dirname, "../.."),
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		port: 5173,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./src/test/setup.ts",
	},
});
