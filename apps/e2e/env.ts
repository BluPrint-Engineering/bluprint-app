import { config } from "dotenv";

config({ path: ["../../.env.local", "../../.env"] });

function portFrom(name: string, fallback: number): number {
	return Number(process.env[name]) || fallback;
}

export const E2E_API_PORT = portFrom("E2E_API_PORT", 3100);
export const E2E_WEB_PORT = portFrom("E2E_WEB_PORT", 5273);

export const API_BASE_URL = `http://localhost:${E2E_API_PORT}`;
export const WEB_BASE_URL = `http://localhost:${E2E_WEB_PORT}`;

export const DATABASE_URL_E2E =
	process.env.DATABASE_URL_E2E ??
	"postgresql://bluprint:bluprint@localhost:5432/bluprint_e2e";
