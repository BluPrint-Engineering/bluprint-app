import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZodValidationPipe } from "nestjs-zod";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { Env } from "./lib/env";

/** Must run before `app.init()`: pipes and filters registered after it are
 * silently ignored by the routes already mounted. */
export function configureApp(app: INestApplication): void {
	const config = app.get(ConfigService<Env, true>);

	app.enableCors({ origin: config.get("CORS_ORIGIN", { infer: true }) });
	app.useGlobalPipes(new ZodValidationPipe());
	app.useGlobalFilters(new AllExceptionsFilter());
}
