import { HealthResponse } from "@bluprint/shared";
import { Controller, Get, Query } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { HealthQueryDto } from "./dto/health-query.dto";
import { HealthService } from "./health.service";

/** Every other route is protected by the global `AuthGuard`; health is the one
 * deliberate exception, and `app.int-spec.ts` keeps it that way. */
@AllowAnonymous()
@Controller("health")
export class HealthController {
	constructor(private readonly health: HealthService) {}

	@Get()
	check(@Query() query: HealthQueryDto): Promise<HealthResponse> {
		return this.health.check(query.verbose);
	}
}
