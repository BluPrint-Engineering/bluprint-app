import { config } from "dotenv";

// Same cwd assumption as ConfigModule.forRoot's envFilePath in app.module.ts.
config({ path: "../../.env" });

if (process.env.DATABASE_URL_TEST) {
	process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
