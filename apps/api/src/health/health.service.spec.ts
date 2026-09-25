import { HealthRepository } from "./health.repository";
import { HealthService } from "./health.service";

function fakeRepository(ping: () => Promise<void>): HealthRepository {
	return { ping } as unknown as HealthRepository;
}

describe("HealthService", () => {
	test("omits the verbose block unless asked", async () => {
		const service = new HealthService(fakeRepository(() => Promise.resolve()));

		expect(await service.check()).not.toHaveProperty("verbose");
	});

	test("reports the node runtime when verbose", async () => {
		const service = new HealthService(fakeRepository(() => Promise.resolve()));

		expect((await service.check(true)).verbose?.runtime).toContain("node");
	});

	test("reports ok/up when the database responds", async () => {
		const service = new HealthService(fakeRepository(() => Promise.resolve()));

		const result = await service.check();

		expect(result.status).toBe("ok");
		expect(result.database).toBe("up");
	});

	test("reports degraded/down when the database is unreachable", async () => {
		const service = new HealthService(
			fakeRepository(() => Promise.reject(new Error("connection refused"))),
		);

		const result = await service.check();

		expect(result.status).toBe("degraded");
		expect(result.database).toBe("down");
	});
});
