import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZodValidationPipe } from "nestjs-zod";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { Env } from "./lib/env";

/**
 * CORS, validação e tratamento de erro. `main.ts` e `app.spec.ts` chamam esta
 * mesma função — é o que impede um contrato que só vale em produção.
 *
 * Precisa rodar ANTES de `app.init()`: pipe e filtro registrados depois são
 * silenciosamente ignorados pelas rotas já montadas.
 */
export function configureApp(app: INestApplication): void {
	const config = app.get(ConfigService<Env, true>);

	app.enableCors({ origin: config.get("CORS_ORIGIN", { infer: true }) });
	app.useGlobalPipes(new ZodValidationPipe());
	app.useGlobalFilters(new AllExceptionsFilter());
}
