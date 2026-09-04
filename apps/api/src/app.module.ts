import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { envSchema } from "./lib/env";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			// Relativo ao cwd do workspace — o mesmo arquivo que o Vite lê via envDir.
			envFilePath: "../../.env",
			// Falha o bootstrap antes de abrir a porta se o env for inválido.
			validate: (raw) => envSchema.parse(raw),
		}),
		HealthModule,
	],
})
export class AppModule {}
