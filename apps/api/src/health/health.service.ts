import { HealthResponse } from "@bluprint/shared";
import { Injectable } from "@nestjs/common";
import { HealthRepository } from "./health.repository";

@Injectable()
export class HealthService {
	private readonly startedAt = Date.now();

	constructor(private readonly repository: HealthRepository) {}

	async check(verbose?: boolean): Promise<HealthResponse> {
		const database = await this.checkDatabase();

		return {
			status: database === "up" ? "ok" : "degraded",
			database,
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

	private async checkDatabase(): Promise<"up" | "down"> {
		try {
			await this.repository.ping();
			return "up";
		} catch {
			return "down";
		}
	}
}
