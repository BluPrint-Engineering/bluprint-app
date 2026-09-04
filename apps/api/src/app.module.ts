import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { envSchema } from "./lib/env";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			// Relative to the workspace cwd — the root .env that Vite also reads.
			envFilePath: "../../.env",
			validate: (raw) => envSchema.parse(raw),
		}),
		HealthModule,
	],
})
export class AppModule {}
