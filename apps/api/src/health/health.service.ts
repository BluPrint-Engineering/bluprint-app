import { HealthResponse } from "@bluprint/shared";
import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE, Database } from "../db/database.module";

@Injectable()
export class HealthService {
	private readonly startedAt = Date.now();

	constructor(@Inject(DATABASE) private readonly db: Database) {}

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
			await this.db.execute(sql`select 1`);
			return "up";
		} catch {
			return "down";
		}
	}
}
