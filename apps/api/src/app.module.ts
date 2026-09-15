import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./db/database.module";
import { HealthModule } from "./health/health.module";
import { envSchema } from "./lib/env";
import { ProjectsModule } from "./projects/projects.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			// Earlier entries win: .env.local overrides .env — docs/adr/0049.
			envFilePath: ["../../.env.local", "../../.env"],
			validate: (raw) => envSchema.parse(raw),
		}),
		DatabaseModule,
		AuthModule,
		HealthModule,
		ProjectsModule,
	],
})
export class AppModule {}
