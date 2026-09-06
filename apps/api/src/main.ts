import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { configureApp, nestApplicationOptions } from "./app";
import { AppModule } from "./app.module";
import { Env } from "./lib/env";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule, nestApplicationOptions);

	configureApp(app);

	await app.listen(
		app.get(ConfigService<Env, true>).get("PORT", { infer: true }),
	);
}

void bootstrap();
