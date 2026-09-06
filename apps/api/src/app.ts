import { INestApplication, NestApplicationOptions } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { ZodValidationPipe } from "nestjs-zod";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { Env } from "./lib/env";

/** The Better Auth handler reads the request stream itself, so Nest's parser
 * must be off; `AuthModule` puts it back for every path but `/api/auth/*`. Tests
 * create the app with these same options. */
export const nestApplicationOptions: NestApplicationOptions = {
	bodyParser: false,
};

/** Must run before `app.init()`: the prefix, pipes and filters registered after
 * it are silently ignored by the routes already mounted. */
export function configureApp(app: INestApplication): void {
	const config = app.get(ConfigService<Env, true>);

	app.setGlobalPrefix("api");
	app.use(helmet());
	app.enableCors({ origin: config.get("CORS_ORIGIN", { infer: true }) });
	app.useGlobalPipes(new ZodValidationPipe());
	app.useGlobalFilters(new AllExceptionsFilter());
}
