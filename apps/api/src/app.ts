import { INestApplication, NestApplicationOptions } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import helmet from "helmet";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestValidationPipe } from "./common/pipes/request-validation.pipe";
import { Env } from "./lib/env";
import { apiDocsEnabled, setupApiDocs } from "./openapi";

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
	app.useGlobalPipes(new RequestValidationPipe());
	app.useGlobalFilters(new AllExceptionsFilter());
	app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));

	// After helmet and CORS: `SwaggerModule.setup` adds its routes straight to
	// the underlying Express instance, in registration order, so mounting it
	// any earlier would serve /api/docs with neither.
	if (apiDocsEnabled(config)) {
		setupApiDocs(app);
	}
}
