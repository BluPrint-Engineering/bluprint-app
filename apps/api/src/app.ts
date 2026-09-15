import { INestApplication, NestApplicationOptions } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import helmet from "helmet";
import { ZodSerializerInterceptor } from "nestjs-zod";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestValidationPipe } from "./common/pipes/request-validation.pipe";
import { Env } from "./lib/env";
import { apiDocsEnabled, setupApiDocs } from "./openapi";

/** Better Auth reads the raw request stream; AuthModule restores the parser for every path but /api/auth/*. */
export const nestApplicationOptions: NestApplicationOptions = {
	bodyParser: false,
};

/** Must run before app.init(): the prefix, pipes and filters registered after are silently ignored by mounted routes. */
export function configureApp(app: INestApplication): void {
	const config = app.get(ConfigService<Env, true>);

	app.setGlobalPrefix("api");
	app.use(helmet());
	app.enableCors({ origin: config.get("CORS_ORIGIN", { infer: true }) });
	app.useGlobalPipes(new RequestValidationPipe());
	app.useGlobalFilters(new AllExceptionsFilter());
	app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));

	// after helmet/CORS: SwaggerModule mounts straight onto Express, in registration order
	if (apiDocsEnabled(config)) {
		setupApiDocs(app);
	}
}
