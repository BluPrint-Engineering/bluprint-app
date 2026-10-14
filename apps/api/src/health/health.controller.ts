import { HealthResponse } from "@bluprint/shared";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ZodResponse } from "nestjs-zod";
import { ApiErrorResponses } from "../common/problems/api-error-responses.decorator";
import { HealthQueryDto } from "./dto/health-query.dto";
import { HealthResponseDto } from "./dto/health-response.dto";
import { HealthService } from "./health.service";

@AllowAnonymous()
@ApiTags("Health")
@Controller("health")
export class HealthController {
	constructor(private readonly health: HealthService) {}

	@Get()
	// `{}`, not omitted: openapi.ts applies the global "session" requirement to every route by default
	@ApiSecurity({})
	@ApiOperation({
		summary: "Health check",
		description:
			"Tells whether the API is up and whether it reaches Postgres. It is the route deployment uses as a healthcheck, and the only public route in the API's own Nest controllers; Better Auth's routes under `/api/auth` are public too.",
	})
	@ZodResponse({
		status: 200,
		description: "The API is reachable.",
		type: HealthResponseDto,
	})
	@ApiErrorResponses(400)
	check(@Query() query: HealthQueryDto): Promise<HealthResponse> {
		return this.health.check(query.verbose);
	}
}
