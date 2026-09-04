import { HealthResponse } from "@bluprint/shared";
import { Controller, Get, Query } from "@nestjs/common";
import { HealthQueryDto } from "./dto/health-query.dto";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
	constructor(private readonly health: HealthService) {}

	@Get()
	check(@Query() query: HealthQueryDto): Promise<HealthResponse> {
		return this.health.check(query.verbose);
	}
}
