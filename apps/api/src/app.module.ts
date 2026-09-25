import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { TransactionalAdapterDrizzleOrm } from "@nestjs-cls/transactional-adapter-drizzle-orm";
import { ClsModule } from "nestjs-cls";
import { AuthModule } from "./auth/auth.module";
import { DATABASE, DatabaseModule } from "./db/database.module";
import { HealthModule } from "./health/health.module";
import { envSchema } from "./lib/env";
import { ProjectsModule } from "./projects/projects.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			// Earlier entries win: .env.local overrides .env (ADR 0049)
			envFilePath: ["../../.env.local", "../../.env"],
			validate: (raw) => envSchema.parse(raw),
		}),
		DatabaseModule,
		ClsModule.forRoot({
			global: true,
			middleware: { mount: true },
			plugins: [
				new ClsPluginTransactional({
					imports: [DatabaseModule],
					adapter: new TransactionalAdapterDrizzleOrm({
						drizzleInstanceToken: DATABASE,
					}),
				}),
			],
		}),
		AuthModule,
		HealthModule,
		ProjectsModule,
	],
})
export class AppModule {}
