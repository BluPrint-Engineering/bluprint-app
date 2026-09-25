import { config } from "dotenv";

// Same cwd assumption as ConfigModule.forRoot's envFilePath in app.module.ts.
config({ path: ["../../.env.local", "../../.env"] });

if (process.env.DATABASE_URL_TEST) {
	process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// no suite reaches the real HIBP API; password-policy.int-spec.ts turns it back on against a stub
process.env.PASSWORD_BREACH_CHECK = "false";
