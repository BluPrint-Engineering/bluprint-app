import {
	Global,
	Inject,
	Injectable,
	Logger,
	Module,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { Env } from "../lib/env";
import * as schema from "./schema";

export const DATABASE = Symbol("DATABASE");
export type Database = NodePgDatabase<typeof schema>;

const POOL = Symbol("PG_POOL");

@Injectable()
class DatabaseHealthCheck implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(DatabaseHealthCheck.name);

	constructor(
		@Inject(POOL) private readonly pool: Pool,
		@Inject(DATABASE) private readonly db: Database,
	) {}

	async onModuleInit(): Promise<void> {
		try {
			await this.db.execute(sql`select 1`);
		} catch (error) {
			this.logger.error(
				"Could not reach Postgres. Is the container up? Run `docker compose up -d --wait`.",
			);
			throw error;
		}
	}

	async onModuleDestroy(): Promise<void> {
		await this.pool.end();
	}
}

@Global()
@Module({
	providers: [
		{
			provide: POOL,
			inject: [ConfigService],
			useFactory: (config: ConfigService<Env, true>) => {
				const pool = new Pool({
					connectionString: config.get("DATABASE_URL", { infer: true }),
					connectionTimeoutMillis: 5_000,
				});
				// pg emits "error" on the pool when an idle client's connection drops.
				// Without a listener, Node treats it as fatal and crashes the process.
				pool.on("error", (error: Error) => {
					new Logger("DatabasePool").error(
						`Idle client error: ${error.message}`,
					);
				});
				return pool;
			},
		},
		{
			provide: DATABASE,
			inject: [POOL],
			useFactory: (pool: Pool): Database => drizzle({ client: pool, schema }),
		},
		DatabaseHealthCheck,
	],
	exports: [DATABASE],
})
export class DatabaseModule {}
