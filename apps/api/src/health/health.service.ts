import { HealthResponse } from "@bluprint/shared";
import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
	private readonly startedAt = Date.now();

	check(verbose?: boolean): HealthResponse {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: (Date.now() - this.startedAt) / 1000,
			...(verbose && {
				verbose: {
					environment: process.env.NODE_ENV ?? "development",
					runtime: `node ${process.version}`,
				},
			}),
		};
	}
}
