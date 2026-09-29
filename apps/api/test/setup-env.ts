import { config } from "dotenv";

config({ path: ["../../.env.local", "../../.env"] });

if (process.env.DATABASE_URL_TEST) {
	process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

process.env.PASSWORD_BREACH_CHECK = "false";
